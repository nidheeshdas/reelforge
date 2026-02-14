import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display home page with title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ReelForge/);
    await expect(page.locator('h1')).toContainText('ReelForge');
  });

  test('should display features section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Text-Based Editing')).toBeVisible();
    await expect(page.getByText('GLSL Shaders')).toBeVisible();
    await expect(page.getByText('Templates')).toBeVisible();
  });

  test('should have working navigation to editor', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Start Creating');
    await expect(page).toHaveURL(/\/editor/);
  });

  test('should have working navigation to templates', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Templates');
    await expect(page).toHaveURL(/\/templates/);
    await expect(page.locator('h1')).toContainText('Templates');
  });
});
