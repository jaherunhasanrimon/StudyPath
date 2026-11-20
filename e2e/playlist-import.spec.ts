import { test, expect } from '@playwright/test';
import mathFixture from '../tests/fixtures/youtube/math-sequential.json';
import ictFixture from '../tests/fixtures/youtube/ict-out-of-order.json';
import privFixture from '../tests/fixtures/youtube/has-private-deleted.json';

test.describe('Playlist Import Flow (/new)', () => {
  test('resolves and displays preview for a sequential playlist within 5s', async ({ page }) => {
    // Intercept resolve API with recorded math fixture
    await page.route('**/api/playlists/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mathFixture),
      });
    });

    const start = Date.now();
    await page.goto('/new');

    const input = page.locator('#playlist-input');
    await expect(input).toBeVisible();
    await input.fill('https://www.youtube.com/playlist?list=PLmath1234567890');

    await page.click('button[type="submit"]');

    // Title and channel rendered
    const title = page.locator('h2', { hasText: 'HSC Higher Math 1st Paper - Chapter 1' });
    await expect(title).toBeVisible({ timeout: 5000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);

    // Channel name visible
    await expect(page.getByText('Onnorokom Pathshala')).toBeVisible();

    // Sequential order badge visible
    await expect(page.getByText(/ক্রমানুসারে সাজানো আছে|Sequential/i)).toBeVisible();

    // First 5 classes shown initially
    const items = page.locator('.divide-y > div');
    await expect(items).toHaveCount(5);

    // Click "Show all"
    const showAllBtn = page.getByRole('button', { name: /ভিডিও দেখুন|Show all/i });
    await expect(showAllBtn).toBeVisible();
    await showAllBtn.click();

    // All 8 classes shown
    await expect(items).toHaveCount(8);
  });

  test('displays error message when empty or invalid input is submitted', async ({ page }) => {
    await page.goto('/new');

    // Submit empty input
    await page.click('button[type="submit"]');
    const alert = page.locator('main [role="alert"]');
    await expect(alert).toBeVisible();

    // Mock API error response for mix playlist
    await page.route('**/api/playlists/resolve', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'MIX_NOT_ALLOWED',
          message: 'YouTube Mixes cannot be scheduled',
        }),
      });
    });

    const input = page.locator('#playlist-input');
    await input.fill('https://www.youtube.com/playlist?list=RDCLAK5uy_k');
    await page.click('button[type="submit"]');

    await expect(alert).toContainText('YouTube Mixes cannot be scheduled');
  });

  test('supports reordering items using up and down buttons', async ({ page }) => {
    await page.route('**/api/playlists/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ictFixture),
      });
    });

    await page.goto('/new');
    const input = page.locator('#playlist-input');
    await input.fill('https://www.youtube.com/playlist?list=PLict1234567890');
    await page.click('button[type="submit"]');

    // Wait for list to load
    await expect(page.getByText('10 Minute School')).toBeVisible();

    const firstItemText = page.locator('.divide-y > div').nth(0).locator('p');
    const secondItemText = page.locator('.divide-y > div').nth(1).locator('p');

    await expect(firstItemText).toContainText('Class 1: Introduction to Binary');
    await expect(secondItemText).toContainText('Class 3: Octal and Hexadecimal');

    // Click down button on first item
    const moveDownBtn = page.locator('.divide-y > div').nth(0).getByRole('button', { name: /Move down|নিচে নিন/i });
    await moveDownBtn.click();

    // Items should now be swapped
    await expect(firstItemText).toContainText('Class 3: Octal and Hexadecimal');
    await expect(secondItemText).toContainText('Class 1: Introduction to Binary');
  });

  test('displays edge case warnings for unavailable videos', async ({ page }) => {
    await page.route('**/api/playlists/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(privFixture),
      });
    });

    // Auto-resolve via URL query parameter
    await page.goto('/new?url=https://www.youtube.com/playlist?list=PLpriv1234567890');

    // Wait for channel title
    await expect(page.getByText("Apar's Classroom")).toBeVisible();

    // Top-level warning for unavailable videos visible
    await expect(page.getByText(/অনুপলব্ধ|unavailable/i).first()).toBeVisible();

    // Video badges on individual items
    const unavailableBadges = page.getByText(/অনুপলব্ধ|Unavailable/i);
    await expect(unavailableBadges.first()).toBeVisible();
  });
});

test.describe('Visual Screenshots (/new)', () => {
  const viewports = [
    { width: 360, height: 800, name: '360' },
    { width: 768, height: 1024, name: '768' },
    { width: 1280, height: 900, name: '1280' },
  ];

  for (const vp of viewports) {
    for (const theme of ['light', 'dark'] as const) {
      test(`step 1 preview at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Set theme via localStorage before navigation
        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

        await page.route('**/api/playlists/resolve', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mathFixture),
          });
        });

        await page.goto('/new?url=https://www.youtube.com/playlist?list=PLmath1234567890');
        await page.waitForLoadState('networkidle');

        // Wait for preview to render
        await expect(page.getByText('Onnorokom Pathshala')).toBeVisible();
        await page.waitForTimeout(400);

        await page.screenshot({
          path: `screenshots/new-preview-${vp.name}-${theme}.png`,
          fullPage: true,
        });
      });
    }
  }
});
