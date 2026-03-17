import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

function scriptEditor(page: Page) {
  return page.locator('textarea[spellcheck="false"]');
}

type TemplateListItem = {
  id: number;
  title: string;
  category: string | null;
  status: string;
  tags: string[];
};

type TemplateDetail = TemplateListItem & {
  placeholders: Array<{ name: string; label: string; type: string }>;
};

async function registerUser(email: string, password: string, request: APIRequestContext) {
  const response = await request.post('/api/auth/register', {
    data: {
      name: 'Editor Template User',
      email,
      password,
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function signInToEditor(page: Page, email: string, password: string) {
  const request = page.context().request;
  const csrfResponse = await request.get('/api/auth/csrf');
  expect(csrfResponse.ok()).toBeTruthy();

  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const signInResponse = await request.post('/api/auth/callback/credentials', {
    form: {
      csrfToken,
      email,
      password,
      callbackUrl: 'http://localhost:3000/editor',
      json: 'true',
    },
  });

  expect(signInResponse.ok()).toBeTruthy();
  await page.goto('/editor');
  await page.waitForLoadState('networkidle');
}

test.describe('Editor Page', () => {
  test('should display editor page', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.getByText('VidScript Editor', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('Preview', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Export/i })).toBeVisible();
  });

  test('should display default code in editor', async ({ page }) => {
    await page.goto('/editor');
    const textarea = scriptEditor(page);
    await expect(textarea).toContainText('Welcome to ReelForge');
    await expect(textarea).toContainText('input main_video');
  });

  test('should validate valid code without errors', async ({ page }) => {
    await page.goto('/editor');
    await scriptEditor(page).fill(`input video = "test.mp4"
[0 - 10] = video
output to "test.mp4", resolution: 1080x1920`);

    await page.waitForTimeout(500);
    await expect(scriptEditor(page)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Preview$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Export/i })).toBeEnabled();
  });

  test('should apply project settings from the sidebar back into the script', async ({ page }) => {
    await page.goto('/editor');

    await page.getByLabel('Output filename').fill('campaign-cut.mp4');
    await page.getByLabel('Canvas width').fill('1080');
    await page.getByLabel('Canvas height').fill('1350');
    await page.getByRole('button', { name: /Apply to script/i }).click();

    await expect(scriptEditor(page)).toContainText('output to "campaign-cut.mp4", resolution: 1080x1350');
    await expect(page.getByRole('main').getByText('1080x1350', { exact: true })).toBeVisible();
  });

  test('should refresh the preview when a canvas preset is selected', async ({ page }) => {
    await page.goto('/editor');

    await page.getByRole('button', { name: /Square/i }).click();

    await expect(scriptEditor(page)).toContainText('output to "output.mp4", resolution: 1080x1080');
    await expect(page.getByRole('main').getByText('1080x1080', { exact: true })).toBeVisible();
  });

  test('should show a compact assets panel without redundant editor navigation', async ({ page }) => {
    await page.goto('/editor');

    await page.getByRole('tab', { name: /Assets/i }).click();

    await expect(page.getByText('Asset sources')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Local/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Samples/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Drive/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Dropbox/i })).toBeVisible();
    await expect(page.getByText(/Back to editor/i)).toHaveCount(0);
  });

  test('should show errors for invalid code', async ({ page }) => {
    await page.goto('/editor');
    await scriptEditor(page).fill(`input video = "test.mp4
[0 - 10] = video`);

    await page.waitForTimeout(500);
    await expect(page.getByText('Errors')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Export/i })).toBeDisabled();
    await expect(scriptEditor(page)).toBeVisible();
  });

  test('should save a private template with extracted placeholders from the editor', async ({ page, request }) => {
    const timestamp = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const email = `editor-template-${timestamp}@example.com`;
    const password = 'supersecure123';
    const templateTitle = `Editor Save Template ${timestamp}`;

    await registerUser(email, password, request);
    await signInToEditor(page, email, password);

    await scriptEditor(page).fill(`# Placeholder metadata: {{headline | Launch day energy}}, {{subhead | Warm cups, fast lines}}, {{cta | Visit today}}
input hero_video = "hero.mp4"
[0 - 6] = hero_video.Trim(0, 6)
[1 - 5] = text "Launch day energy", style: title, position: center
output to "editor-save-template.mp4", resolution: 1080x1920`);

    await expect(page.getByText('{{headline}}').first()).toBeVisible();
    await expect(page.getByText('{{subhead}}').first()).toBeVisible();
    await expect(page.getByText('{{cta}}').first()).toBeVisible();

    await page.getByLabel('Description').fill('Saved from the editor regression to verify private template persistence.');
    await page.getByLabel('Category').fill('ads');
    await page.getByLabel('Tags').fill('launch, social, launch');
    await page.getByLabel('Status').selectOption('private');
    await page.getByLabel('Title').fill(templateTitle);
    await page.getByRole('button', { name: 'Save as template' }).click();

    await expect(page.getByText('Template saved')).toBeVisible();
    await expect(page.getByText(new RegExp(`${templateTitle} was saved with 3 placeholders as a private template\\.`))).toBeVisible();

    const mineResponse = await page.context().request.get('/api/templates?scope=mine');
    expect(mineResponse.ok()).toBeTruthy();

    const mineData = (await mineResponse.json()) as { templates?: TemplateListItem[] };
    const savedTemplate = mineData.templates?.find((template) => template.title === templateTitle);

    expect(savedTemplate).toBeDefined();
    expect(savedTemplate?.status).toBe('private');
    expect(savedTemplate?.category).toBe('ads');
    expect(savedTemplate?.tags).toEqual(['launch', 'social']);

    const detailResponse = await page.context().request.get(`/api/templates/${savedTemplate!.id}`);
    expect(detailResponse.ok()).toBeTruthy();

    const detailData = (await detailResponse.json()) as { template?: TemplateDetail };
    expect(detailData.template?.placeholders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'headline', label: 'Headline', type: 'text' }),
        expect.objectContaining({ name: 'subhead', label: 'Subhead', type: 'text' }),
        expect.objectContaining({ name: 'cta', label: 'Cta', type: 'text' }),
      ])
    );

    const publicResponse = await page.context().request.get('/api/templates?scope=public');
    expect(publicResponse.ok()).toBeTruthy();

    const publicData = (await publicResponse.json()) as { templates?: TemplateListItem[] };
    expect(publicData.templates?.some((template) => template.title === templateTitle)).toBeFalsy();

    await page.goto('/account');
    await page.getByRole('tab', { name: 'My Templates' }).click();
    await expect(page.getByText(templateTitle, { exact: true })).toBeVisible();
    await expect(page.getByText('Private workspace').first()).toBeVisible();
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/editor');
    await page.getByRole('link', { name: /ReelForge/i }).first().click();
    await expect(page).toHaveURL('/');
  });
});
