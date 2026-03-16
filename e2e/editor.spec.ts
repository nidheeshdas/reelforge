import { test, expect } from '@playwright/test';

test.describe('Editor Page', () => {
  test('should display editor page', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.getByText('VidScript Editor', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('Preview', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Export/i })).toBeVisible();
  });

  test('should display default code in editor', async ({ page }) => {
    await page.goto('/editor');
    const textarea = page.locator('textarea');
    await expect(textarea).toContainText('Welcome to ReelForge');
    await expect(textarea).toContainText('input main_video');
  });

  test('should validate valid code without errors', async ({ page }) => {
    await page.goto('/editor');
    await page.locator('textarea').fill(`input video = "test.mp4"
[0 - 10] = video
output to "test.mp4", resolution: 1080x1920`);

    await page.waitForTimeout(500);
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Preview$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Export/i })).toBeEnabled();
  });

  test('should apply project settings from the sidebar back into the script', async ({ page }) => {
    await page.goto('/editor');

    await page.getByLabel('Output filename').fill('campaign-cut.mp4');
    await page.getByLabel('Canvas width').fill('1080');
    await page.getByLabel('Canvas height').fill('1350');
    await page.getByRole('button', { name: /Apply to script/i }).click();

    await expect(page.locator('textarea')).toContainText('output to "campaign-cut.mp4", resolution: 1080x1350');
    await expect(page.getByRole('main').getByText('1080x1350', { exact: true })).toBeVisible();
  });

  test('should refresh the preview when a canvas preset is selected', async ({ page }) => {
    await page.goto('/editor');

    await page.getByRole('button', { name: /Square/i }).click();

    await expect(page.locator('textarea')).toContainText('output to "output.mp4", resolution: 1080x1080');
    await expect(page.getByRole('main').getByText('1080x1080', { exact: true })).toBeVisible();
  });

  test('should show errors for invalid code', async ({ page }) => {
    await page.goto('/editor');
    await page.locator('textarea').fill(`input video = "test.mp4
[0 - 10] = video`);

    await page.waitForTimeout(500);
    await expect(page.getByText('Errors')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Export/i })).toBeDisabled();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/editor');
    await page.getByRole('link', { name: /ReelForge/i }).first().click();
    await expect(page).toHaveURL('/');
  });
});
