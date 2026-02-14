import { test, expect } from '@playwright/test';

test.describe('Templates Page', () => {
  test('should display templates gallery', async ({ page }) => {
    await page.goto('/templates');
    await expect(page.locator('h1')).toContainText('Templates');
    await expect(page.getByText('Wedding Reel')).toBeVisible();
    await expect(page.getByText('Travel Vlog')).toBeVisible();
    await expect(page.getByText('Fitness Promo')).toBeVisible();
  });

  test('should display template details', async ({ page }) => {
    await page.goto('/templates');
    await expect(page.getByText('Beautiful wedding highlights')).toBeVisible();
    await expect(page.getByText('$0.05')).toBeVisible();
    await expect(page.getByText('Free')).toBeVisible();
  });

  test('should navigate to template detail', async ({ page }) => {
    await page.goto('/templates');
    await page.click('text=Use Template >> nth=0');
    await expect(page).toHaveURL(/\/templates\/\d+/);
    await expect(page.locator('text=Fill Placeholders')).toBeVisible();
  });

  test('should have create new button', async ({ page }) => {
    await page.goto('/templates');
    await page.click('text=Create New');
    await expect(page).toHaveURL(/\/editor/);
  });
});

test.describe('Template Detail Page', () => {
  test('should display wedding template details', async ({ page }) => {
    await page.goto('/templates/1');
    await expect(page.locator('h1')).toContainText('Wedding Reel');
    await expect(page.getByText('Fill Placeholders')).toBeVisible();
  });

  test('should show placeholder inputs', async ({ page }) => {
    await page.goto('/templates/1');
    await expect(page.getByText('Main Video')).toBeVisible();
    await expect(page.getByText('Background Music')).toBeVisible();
    await expect(page.getByText('Title Text')).toBeVisible();
  });

  test('should navigate back to templates', async ({ page }) => {
    await page.goto('/templates/1');
    await page.click('text=← Back to Templates');
    await expect(page).toHaveURL('/templates');
  });
});
