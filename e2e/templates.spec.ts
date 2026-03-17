import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

type PublicTemplateListItem = {
  id: number;
  title: string;
  description: string | null;
  priceCents: number;
};

type TemplateDetailResponse = {
  template: {
    id: number;
    title: string;
    description: string | null;
    vidscript: string;
    placeholders: Array<{
      name: string;
      label: string;
      type: string;
      defaultValue?: string | number;
    }>;
  };
};

type CreatedTemplate = TemplateDetailResponse['template'] & {
  status: string;
};

async function registerUser(email: string, password: string, request: APIRequestContext) {
  const response = await request.post('/api/auth/register', {
    data: {
      name: 'Template Test User',
      email,
      password,
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function signInRequest(request: APIRequestContext, email: string, password: string) {
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
}

async function createPublicTemplate(request: APIRequestContext) {
  const timestamp = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  const email = `template-public-${timestamp}@example.com`;
  const password = 'supersecure123';
  const title = `Neighborhood Coffee Launch ${timestamp}`;
  const description = 'A vertical launch spot for cafés, bakeries, and neighborhood food brands with a headline, offer, and closing CTA.';

  return createConfiguredPublicTemplate(request, {
    email,
    password,
    title,
    description,
    category: 'ads',
  });
}

async function createConfiguredPublicTemplate(
  request: APIRequestContext,
  {
    email,
    password,
    title,
    description,
    category,
  }: {
    email: string;
    password: string;
    title: string;
    description: string;
    category: string;
  }
) {
  const templateCategory = category;

  await registerUser(email, password, request);
  await signInRequest(request, email, password);

  const response = await request.post('/api/templates', {
    data: {
      title,
      description,
      category: templateCategory,
      status: 'public',
      vidscript: `# ${title}
input hero_video = {{video1}}
input music = {{music | upbeat-cafe.mp3}}

[0s - {{duration | 15}}s] = hero_video.Trim(0, {{duration | 15}})
[0s - end] = filter "{{effect | warm}}", intensity: {{effect_intensity | 0.35}}
[0s - end] = audio music, volume: {{music_volume | 0.65}}, fade_out: 2s

[0.5s - 3s] = text "{{brand_name | North Roast}}", style: title, position: top-left
[3s - 7s] = text "{{headline | Brewed for better mornings}}", style: subtitle, position: center
[7s - 11s] = text "{{offer | Opening week: free pastry with any latte}}", style: caption, position: bottom-center
[11s - end] = text "{{cta | Visit today}}", style: title, position: bottom-right

output to "neighborhood-coffee-launch.mp4", resolution: 1080x1920`,
      placeholders: [
        {
          name: 'video1',
          type: 'video',
          label: 'Hero product video',
          required: true,
          group: 'Media',
          helpText: 'Use a close-up pour, storefront clip, or menu reveal.',
          accept: ['video/mp4', 'video/quicktime'],
        },
        {
          name: 'music',
          type: 'audio',
          label: 'Background music',
          required: false,
          group: 'Media',
          default: 'upbeat-cafe.mp3',
          helpText: 'Light, upbeat audio works best for local shop promos.',
        },
        {
          name: 'brand_name',
          type: 'text',
          label: 'Brand name',
          required: true,
          group: 'Copy',
          default: 'North Roast',
          maxLength: 28,
        },
        {
          name: 'headline',
          type: 'text',
          label: 'Headline',
          required: true,
          group: 'Copy',
          default: 'Brewed for better mornings',
          maxLength: 52,
        },
        {
          name: 'offer',
          type: 'textarea',
          label: 'Offer',
          required: true,
          group: 'Copy',
          default: 'Opening week: free pastry with any latte',
          maxLength: 72,
        },
        {
          name: 'cta',
          type: 'text',
          label: 'Call to action',
          required: true,
          group: 'Copy',
          default: 'Visit today',
          maxLength: 24,
        },
        {
          name: 'effect',
          type: 'select',
          label: 'Color treatment',
          required: true,
          group: 'Style',
          default: 'warm',
          options: ['warm', 'contrast', 'vintage', 'none'],
        },
        {
          name: 'effect_intensity',
          type: 'number',
          label: 'Effect intensity',
          required: true,
          group: 'Style',
          default: 0.35,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          name: 'music_volume',
          type: 'number',
          label: 'Music volume',
          required: true,
          group: 'Style',
          default: 0.65,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          name: 'duration',
          type: 'number',
          label: 'Clip duration',
          required: true,
          group: 'Timing',
          default: 15,
          min: 8,
          max: 30,
          step: 1,
          unit: 'seconds',
        },
      ],
      defaultValues: {
        video1: 'coffee-pour.mp4',
        music: 'upbeat-cafe.mp3',
        brand_name: 'North Roast',
        headline: 'Brewed for better mornings',
        offer: 'Opening week: free pastry with any latte',
        cta: 'Visit today',
        effect: 'warm',
        effect_intensity: 0.35,
        music_volume: 0.65,
        duration: 15,
      },
      tags: ['free', 'launch'],
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as { template?: CreatedTemplate };
  expect(data.template).toBeDefined();
  return data.template!;
}

async function getPublicTemplates(request: APIRequestContext) {
  const response = await request.get('/api/templates?scope=public');
  expect(response.ok()).toBeTruthy();

  const data = (await response.json()) as { templates?: PublicTemplateListItem[] };
  return data.templates ?? [];
}

async function getTemplateDetail(request: APIRequestContext, templateId: number) {
  const response = await request.get(`/api/templates/${templateId}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as TemplateDetailResponse;
}

test.describe('Templates Page', () => {
  test('renders the DB-backed public template library', async ({ page, request }) => {
    const createdTemplate = await createPublicTemplate(request);
    const publicTemplates = await getPublicTemplates(request);
    const featuredTemplate = publicTemplates.find((template) => template.id === createdTemplate.id);

    expect(publicTemplates.length).toBeGreaterThan(0);
    expect(featuredTemplate).toBeDefined();

    await page.goto('/templates');

    await expect(page.getByRole('heading', { name: 'Templates' })).toBeVisible();
    await expect(page.getByText('Ready-made templates')).toBeVisible();
    await expect(page.getByText(featuredTemplate.title, { exact: true })).toBeVisible();

    if (featuredTemplate.description) {
      await expect(page.getByText(featuredTemplate.description, { exact: true }).first()).toBeVisible();
    }

    await expect(page.getByRole('link', { name: 'Use Template' }).first()).toBeVisible();
    await expect(
      page.getByText(featuredTemplate.priceCents === 0 ? 'Free' : `$${(featuredTemplate.priceCents / 100).toFixed(2)}`).first()
    ).toBeVisible();
  });

  test('filters the public library by category and keeps filter params in sync', async ({ page, request }) => {
    const timestamp = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const adsTitle = `Ads Filter Coverage ${timestamp}`;
    const memesTitle = `Memes Filter Coverage ${timestamp}`;

    await createConfiguredPublicTemplate(request, {
      email: `template-filter-ads-${timestamp}@example.com`,
      password: 'supersecure123',
      title: adsTitle,
      description: 'Unique ads template used to verify category filtering.',
      category: 'ads',
    });

    await createConfiguredPublicTemplate(request, {
      email: `template-filter-memes-${timestamp}@example.com`,
      password: 'supersecure123',
      title: memesTitle,
      description: 'Unique memes template used to verify category filtering.',
      category: 'memes',
    });

    await page.goto('/templates');

    await page.getByLabel('Category').selectOption('memes');
    await expect(page).toHaveURL(/\/templates\?category=memes$/);
    await expect(page.getByText(memesTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(adsTitle, { exact: true })).toHaveCount(0);

    await page.getByLabel('Sort').selectOption('popular');
    await expect(page).toHaveURL(/\/templates\?category=memes&sort=popular$/);
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).toHaveURL('/templates');
    await expect(page.getByLabel('Category')).toHaveValue('');
    await expect(page.getByLabel('Sort')).toHaveValue('recent');
    await expect(page.getByText(memesTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(adsTitle, { exact: true })).toBeVisible();
  });

  test('keeps the create-new entry point wired to the editor', async ({ page }) => {
    await page.goto('/templates');
    await page.getByRole('link', { name: 'Create New' }).click();
    await expect(page).toHaveURL('/editor');
    await expect(page.getByText('VidScript Editor', { exact: true })).toBeVisible();
  });
});

test.describe('Template Detail Page', () => {
  test('loads placeholder-driven controls for a seeded template', async ({ page, request }) => {
    const createdTemplate = await createPublicTemplate(request);
    const detail = await getTemplateDetail(request, createdTemplate.id);

    await page.goto(`/templates/${createdTemplate.id}`);

    await expect(page.getByRole('heading', { name: detail.template.title })).toBeVisible();
    await expect(page.getByText('Fill Placeholders')).toBeVisible();
    await expect(page.getByText('Make the template yours')).toBeVisible();

    await expect(page.getByText('Media', { exact: true })).toBeVisible();
    await expect(page.getByText('Copy', { exact: true })).toBeVisible();
    await expect(page.getByText('Style', { exact: true })).toBeVisible();
    await expect(page.getByText('Timing', { exact: true })).toBeVisible();

    await expect(page.getByLabel('Hero product video')).toHaveValue('coffee-pour.mp4');
    await expect(page.getByLabel('Background music')).toHaveValue('upbeat-cafe.mp3');
    await expect(page.getByLabel('Brand name')).toHaveValue('North Roast');
    await expect(page.getByLabel('Offer')).toHaveValue('Opening week: free pastry with any latte');
    await expect(page.getByLabel('Color treatment')).toHaveValue('warm');
    await expect(page.getByLabel('Effect intensity')).toHaveValue('0.35');
    await expect(page.getByLabel('Clip duration')).toHaveValue('15');
    await expect(page.getByText(/Accepted formats: video\/mp4,video\/quicktime/i)).toBeVisible();
  });

  test('fills placeholders and imports the generated script into the editor', async ({ page, request }) => {
    const createdTemplate = await createPublicTemplate(request);

    await page.goto(`/templates/${createdTemplate.id}`);

    await page.getByLabel('Hero product video').fill('launch-pour.mp4');
    await page.getByLabel('Background music').fill('launch-loop.mp3');
    await page.getByLabel('Brand name').fill('Beacon Coffee');
    await page.getByLabel('Headline').fill('Fresh pours, all day');
    await page.getByLabel('Offer').fill('Grand opening week: free cookie with every espresso');
    await page.getByLabel('Call to action').fill('Stop in today');
    await page.getByLabel('Color treatment').selectOption('vintage');
    await page.getByLabel('Effect intensity').fill('0.6');
    await page.getByLabel('Music volume').fill('0.8');
    await page.getByLabel('Clip duration').fill('18');

    await page.getByRole('button', { name: 'Use Template' }).click();

    await expect(page).toHaveURL('/editor');
    await expect(page.getByText('VidScript Editor', { exact: true })).toBeVisible();

    const textarea = page.locator('textarea').last();
    await expect(textarea).toContainText('Beacon Coffee');
    await expect(textarea).toContainText('Fresh pours, all day');
    await expect(textarea).toContainText('Grand opening week: free cookie with every espresso');
    await expect(textarea).toContainText('filter "vintage", intensity: 0.6');
    await expect(textarea).toContainText('volume: 0.8');
    await expect(textarea).toContainText('[0s - 18s] = hero_video.Trim(0, 18)');
    await expect(textarea).not.toContainText('{{brand_name');
    await expect(textarea).not.toContainText('{{duration');
  });

  test('can navigate back to the template library', async ({ page, request }) => {
    const createdTemplate = await createPublicTemplate(request);

    await page.goto(`/templates/${createdTemplate.id}`);
    await page.getByRole('link', { name: '← Back to Templates' }).click();
    await expect(page).toHaveURL('/templates');
  });
});
