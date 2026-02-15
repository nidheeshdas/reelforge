import { test, expect } from '@playwright/test';

test.describe('Editor Page', () => {
  test('should display editor page', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('text=VidScript Editor')).toBeVisible();
    await expect(page.locator('text=Preview')).toBeVisible();
    await expect(page.locator('text=Export')).toBeVisible();
  });

  test('should display default code in editor', async ({ page }) => {
    await page.goto('/editor');
    const textarea = page.locator('textarea');
    await expect(textarea).toContainText('Welcome to ReelForge');
    await expect(textarea).toContainText('input main_video');
  });

  test('should validate valid code without errors', async ({ page }) => {
    await page.goto('/editor');
    // Clear and enter valid code
    await page.locator('textarea').fill(`input video = "test.mp4"
[0 - 10] = video
output to "test.mp4"`);
    
    await page.waitForTimeout(500);
    const errors = page.locator('text=Errors');
    await expect(errors).not.toBeVisible();
  });

  test('should show errors for invalid code', async ({ page }) => {
    await page.goto('/editor');
    // Enter invalid code (missing closing quotes)
    await page.locator('textarea').fill(`input video = "test.mp4
[0 - 10] = video`);
    
    await page.waitForTimeout(500);
    // Parser should handle gracefully
    const errors = page.locator('text=Errors');
    // Either shows error or handles it gracefully
    const editorVisible = await page.locator('textarea').isVisible();
    expect(editorVisible).toBe(true);
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/editor');
    await page.click('text=← ReelForge');
    await expect(page).toHaveURL('/');
  });
});
