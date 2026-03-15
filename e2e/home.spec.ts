import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display home page with title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Create videos with');
    await expect(page.locator('.gradient-text')).toContainText('plain text');
  });

  test('should display features section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Text-Based' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'GLSL Shaders' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Templates' })).toBeVisible();
  });

  test('should have working navigation to editor', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Start Creating');
    await expect(page).toHaveURL(/\/editor/);
  });

  test('should have working navigation to templates', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Templates' }).first().click();
    await expect(page).toHaveURL(/\/templates/);
    await expect(page.locator('h1')).toContainText('Templates');
  });
});
