import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

type CreatedTemplate = {
  id: number;
  title: string;
  status: string;
  vidscript: string;
};

async function registerUser(email: string, password: string, request: APIRequestContext) {
  const response = await request.post('/api/auth/register', {
    data: {
      name: 'Account Test User',
      email,
      password,
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function signInToAccount(page: Page, email: string, password: string) {
  const request = page.context().request;
  const csrfResponse = await request.get('/api/auth/csrf');
  expect(csrfResponse.ok()).toBeTruthy();

  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const signInResponse = await request.post('/api/auth/callback/credentials', {
    form: {
      csrfToken,
      email,
      password,
      callbackUrl: 'http://localhost:3000/account',
      json: 'true',
    },
  });

  expect(signInResponse.ok()).toBeTruthy();

  const sessionResponse = await request.get('/api/auth/session');
  const session = (await sessionResponse.json()) as { user?: { email?: string } };
  expect(session.user?.email).toBe(email);

  await page.goto('/account');
  await page.waitForLoadState('networkidle');
}

async function createTemplate(
  request: APIRequestContext,
  {
    title,
    status = 'private',
  }: {
    title: string;
    status?: 'draft' | 'private' | 'public';
  }
) {
  const vidscript = `input hero_video = "hero.mp4"
[0s - 6s] = hero_video.Trim(0, 6)
[0.5s - end] = text "Account lifecycle smoke test", style: title, position: center
output to "account-template.mp4", resolution: 1080x1920`;

  const response = await request.post('/api/templates', {
    data: {
      title,
      description: 'Reusable template created by the Playwright account lifecycle regression.',
      category: 'ads',
      status,
      vidscript,
      placeholders: [],
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as { template?: CreatedTemplate };
  expect(data.template).toBeDefined();
  return data.template!;
}

test.describe('Account Page', () => {
  test('shows a polished signed-out workspace shell', async ({ page }) => {
    await page.goto('/account');

    await expect(page.getByRole('heading', { name: 'Connect your ReelForge workspace' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in to continue' })).toBeVisible();
    await expect(page.getByText('GitHub', { exact: true })).toBeVisible();
    await expect(page.getByText('Google Drive', { exact: true })).toBeVisible();
    await expect(page.getByText('Dropbox', { exact: true })).toBeVisible();
  });

  test('supports signed-in account management flows', async ({ page, request }) => {
    const email = `account-test-${Date.now()}-${Math.round(Math.random() * 100000)}@example.com`;
    const password = 'supersecure123';

    await registerUser(email, password, request);
    await signInToAccount(page, email, password);

    await expect(page.getByText(email).first()).toBeVisible();
    await expect(page.getByText('Setup status')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Manage assets' })).toBeVisible();

    await page.getByRole('tab', { name: 'API Keys' }).click();
    await page.locator('#account-api-provider').selectOption('openai');
    await page.locator('#account-api-label').fill('Primary');
    await page.locator('#account-api-key').fill('sk-test-openai-key');
    await page.getByRole('button', { name: 'Add API key' }).click();

    await expect(page.getByText('API key added')).toBeVisible();
    await expect(page.locator('p.font-medium', { hasText: 'OpenAI' })).toBeVisible();

    await page.getByRole('tab', { name: 'Connections' }).click();
    await expect(page.getByRole('button', { name: 'Connect' }).first()).toBeVisible();
    await expect(page.getByText('R2 is the planned shared object-storage backend')).toBeVisible();
  });

  test('shows and manages templates from the signed-in account workspace', async ({ page, request }) => {
    const email = `account-templates-${Date.now()}-${Math.round(Math.random() * 100000)}@example.com`;
    const password = 'supersecure123';
    const templateTitle = `Lifecycle Template ${Date.now()}`;

    await registerUser(email, password, request);
    await signInToAccount(page, email, password);

    const createdTemplate = await createTemplate(page.context().request, {
      title: templateTitle,
      status: 'private',
    });

    await page.getByRole('tab', { name: 'My Templates' }).click();

    await expect(page.getByText('My templates', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse library' })).toBeVisible();
    await expect(page.getByText(templateTitle, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open in editor' })).toBeVisible();

    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Template published')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

    await page.getByRole('button', { name: 'Unpublish' }).click();
    await expect(page.getByText('Template unpublished')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();

    await page.getByRole('button', { name: 'Open in editor' }).click();
    await expect(page).toHaveURL('/editor');
    const editorTextarea = page.locator('textarea').last();
    await expect(editorTextarea).toContainText('Account lifecycle smoke test');
    await expect(editorTextarea).toContainText('output to "account-template.mp4", resolution: 1080x1920');

    const mineResponse = await page.context().request.get('/api/templates?scope=mine');
    expect(mineResponse.ok()).toBeTruthy();
    const mineData = (await mineResponse.json()) as { templates?: Array<{ id: number; status: string; title: string }> };
    const savedTemplate = mineData.templates?.find((template) => template.id === createdTemplate.id);

    expect(savedTemplate?.title).toBe(templateTitle);
    expect(savedTemplate?.status).toBe('private');
  });
});
