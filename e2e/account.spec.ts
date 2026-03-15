import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

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
});
