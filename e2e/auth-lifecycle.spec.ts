import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

type MockEmail = {
  id: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  createdAt: string;
};

async function clearEmails(request: APIRequestContext) {
  const response = await request.delete('/api/dev/emails');
  expect(response.ok()).toBeTruthy();
}

async function readEmails(request: APIRequestContext) {
  const response = await request.get('/api/dev/emails');
  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as { emails?: MockEmail[] };
  return data.emails ?? [];
}

async function waitForEmail(request: APIRequestContext, matcher: (email: MockEmail) => boolean) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const emails = await readEmails(request);
    const match = emails.find(matcher);

    if (match) {
      return match;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Timed out waiting for mock email.');
}

async function registerUser(email: string, password: string, request: APIRequestContext) {
  const response = await request.post('/api/auth/register', {
    data: {
      name: 'Lifecycle Test User',
      email,
      password,
    },
  });

  expect(response.ok()).toBeTruthy();
}

test.describe('Auth lifecycle', () => {
  test('sends verification and password reset emails through the mock provider', async ({ page, request }) => {
    const timestamp = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
    const email = `auth-lifecycle-${timestamp}@example.com`;
    const originalPassword = 'supersecure123';
    const nextPassword = 'evenmoresecure456';

    await clearEmails(request);
    await registerUser(email, originalPassword, request);

    const verificationEmail = await waitForEmail(
      request,
      (message) => message.to === email && message.subject.includes('Verify your ReelForge email'),
    );

    expect(verificationEmail.text).toContain('/api/auth/verify-email?token=');
    const verificationUrl = verificationEmail.text.match(/https?:\/\/\S+/)?.[0];
    expect(verificationUrl).toBeTruthy();
    const normalizedVerificationUrl = new URL(verificationUrl!);

    await page.goto(`${normalizedVerificationUrl.pathname}${normalizedVerificationUrl.search}`);
    await expect(page).toHaveURL(/\/auth\/login\?verification=verified/);
    await expect(page.getByText('Email verified. You can sign in normally.')).toBeVisible();

    await page.goto('/auth/forgot-password');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('If that email exists, a reset link has been sent.')).toBeVisible();

    const resetEmail = await waitForEmail(
      request,
      (message) => message.to === email && message.subject.includes('Reset your ReelForge password'),
    );

    expect(resetEmail.text).toContain('/auth/reset-password?token=');
    const resetUrl = resetEmail.text.match(/https?:\/\/\S+/)?.[0];
    expect(resetUrl).toBeTruthy();
    const normalizedResetUrl = new URL(resetUrl!);

    await page.goto(`${normalizedResetUrl.pathname}${normalizedResetUrl.search}`);
    await page.getByLabel('New password').fill(nextPassword);
    await page.getByLabel('Confirm password').fill(nextPassword);
    await page.getByRole('button', { name: 'Save new password' }).click();

    await expect(page).toHaveURL(/\/auth\/login\?reset=success/);
    await expect(page.getByText('Password updated. Sign in with your new password.')).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(nextPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/editor');
  });
});
