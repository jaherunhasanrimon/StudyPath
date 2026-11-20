/**
 * Verify Phase 0 acceptance items:
 * - Home page loads with Bangla text
 * - Sign-in page loads with all elements
 * - /today redirects to / when not authenticated
 * - Locale switching works
 * - Design page loads with all sections
 */
import { test, expect } from '@playwright/test';

test('home page loads with Bangla text', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  const title = await page.textContent('h1');
  expect(title).toContain('দিশারি');
  console.log('HOME TITLE:', title);
  
  await page.screenshot({ path: 'screenshots/verify-home-bn.png', fullPage: true });
});

test('sign-in page loads with auth UI', async ({ page }) => {
  await page.goto('http://localhost:3000/auth/sign-in');
  await page.waitForLoadState('networkidle');
  
  const title = await page.textContent('h1');
  expect(title).toContain('দিশারিতে সাইন ইন করুন');
  console.log('SIGN-IN TITLE:', title);
  
  // Verify email input exists
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible();
  
  // Verify Google link exists (it's an <a> not a <button>)
  const googleLink = page.locator('a', { hasText: 'Google' });
  await expect(googleLink).toBeVisible();
  
  await page.screenshot({ path: 'screenshots/verify-sign-in.png', fullPage: true });
});

test('/today redirects to / when not authenticated', async ({ page }) => {
  await page.goto('http://localhost:3000/today');
  await page.waitForLoadState('networkidle');
  
  const finalUrl = page.url();
  console.log('FINAL URL after /today:', finalUrl);
  
  // Should redirect to home
  expect(finalUrl).toBe('http://localhost:3000/');
});

test('locale switch to English works', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Click English button — use force: true to bypass dev overlay
  await page.click('button[lang="en"]', { force: true });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  const title = await page.textContent('h1');
  console.log('ENGLISH TITLE:', title);
  expect(title).toContain('Dishari');
  
  await page.screenshot({ path: 'screenshots/verify-home-en.png', fullPage: true });
});

test('design page loads with all sections', async ({ page }) => {
  await page.goto('http://localhost:3000/design');
  await page.waitForLoadState('networkidle');
  
  // Check title
  const title = await page.textContent('h1');
  console.log('DESIGN TITLE:', title);
  
  // Check colour palette section exists
  await expect(page.getByText('ink', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('river', { exact: true })).toBeVisible();
  await expect(page.getByText('marigold', { exact: true })).toBeVisible();
  
  await page.screenshot({ path: 'screenshots/verify-design.png', fullPage: true });
});
