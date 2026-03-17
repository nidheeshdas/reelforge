import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display refreshed home page value proposition', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Build short-form videos you can edit, reuse, and scale.',
    );
    await expect(
      page.getByText('Faster than timeline editing. More reliable than one-shot AI prompts.'),
    ).toBeVisible();
  });

  test('should display the new homepage sections', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', {
        name: 'Give every video a reusable structure before the timeline chaos starts.',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'Move from concept to export without losing the thread of the story.',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Start fast, then save the parts you want to repeat.' }),
    ).toBeVisible();
  });

  test('should have working navigation to editor', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Open editor' }).first().click();
    await expect(page).toHaveURL(/\/editor/);
  });

  test('should have working navigation to templates', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Start with a template' }).click();
    await expect(page).toHaveURL(/\/templates/);
    await expect(page.locator('h1')).toContainText('Templates');
  });
});
