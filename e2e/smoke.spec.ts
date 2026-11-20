import { test, expect } from '@playwright/test';

test.describe('Design page smoke test', () => {
  test('loads and shows the design system', async ({ page }) => {
    await page.goto('/design');
    await expect(page.locator('h1')).toContainText(/Design System|ডিজাইন সিস্টেম/);
  });
});

test.describe('Home page', () => {
  test('loads the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});
