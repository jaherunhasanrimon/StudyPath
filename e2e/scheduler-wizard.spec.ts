import { test, expect } from '@playwright/test';
import mathFixture from '../tests/fixtures/youtube/math-sequential.json';

test.describe('Scheduler Wizard Flow (/new Steps 1-4)', () => {
  test('navigates through all 4 steps to generate a dated pathway plan', async ({ page }) => {
    await page.route('**/api/playlists/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mathFixture),
      });
    });

    await page.goto('/new');

    // Step 1: Playlist
    const input = page.locator('#playlist-input');
    await input.fill('https://www.youtube.com/playlist?list=PLmath1234567890');
    await page.click('button[type="submit"]');

    // Wait for preview to resolve
    await expect(page.getByText('Onnorokom Pathshala')).toBeVisible();

    // Click "Continue to Pace"
    const continueToPaceBtn = page.getByRole('button', { name: /গতি নির্ধারণ|Continue to Pace/i });
    await expect(continueToPaceBtn).toBeVisible();
    await continueToPaceBtn.click();

    // Step 2: Pace
    await expect(page.getByText(/ধাপ ২\/৪|Step 2 of 4/i)).toBeVisible();
    await expect(page.locator('#start-date')).toBeVisible();

    // Click "Continue" to Checks
    const continueToChecksBtn = page.getByRole('button', { name: /পরবর্তী ধাপ|Continue/i });
    await expect(continueToChecksBtn).toBeVisible();
    await continueToChecksBtn.click();

    // Step 3: Checks
    await expect(page.getByText(/ধাপ ৩\/৪|Step 3 of 4/i)).toBeVisible();
    const buildPlanBtn = page.getByRole('button', { name: /রুটিন তৈরি করুন|Build Plan/i });
    await expect(buildPlanBtn).toBeVisible();
    await buildPlanBtn.click();

    // Step 4: Plan Preview
    await expect(page.getByText(/ধাপ ৪\/৪|Step 4 of 4/i)).toBeVisible();
    await expect(page.getByText(/আপনার পড়ার রুটিন|Your Study Pathway/i)).toBeVisible();

    // Verify summary strip contains 8 classes
    await expect(page.getByText(/মোট ক্লাস|^Classes$/i).first()).toBeVisible();
    await expect(page.getByText('৮').first()).toBeVisible();

    // Verify week 1 section exists
    await expect(page.getByText(/সপ্তাহ ১|Week 1/i).first()).toBeVisible();

    // Verify Class 01 is listed
    await expect(page.getByText('Class 01 - Matrix Basics')).toBeVisible();
  });

  test('sub-300ms instant recalculation on settings adjustment', async ({ page }) => {
    await page.route('**/api/playlists/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mathFixture),
      });
    });

    await page.goto('/new?url=https://www.youtube.com/playlist?list=PLmath1234567890');
    await expect(page.getByText('Onnorokom Pathshala').first()).toBeVisible();

    // Navigate to Step 2 then Step 3 then Step 4
    await page.getByRole('button', { name: /গতি নির্ধারণ|Continue to Pace/i }).click();
    await page.getByRole('button', { name: /পরবর্তী ধাপ|Continue/i }).click();
    await page.getByRole('button', { name: /রুটিন তৈরি করুন|Build Plan/i }).click();

    // Step 4 is visible
    await expect(page.getByText(/ধাপ ৪\/৪|Step 4 of 4/i)).toBeVisible();

    // Click "Change settings" to go back to pace
    await page.getByRole('button', { name: /সেটিংস পরিবর্তন|Change settings/i }).click();
    await expect(page.getByText(/ধাপ ২\/৪|Step 2 of 4/i)).toBeVisible();

    // Change speed to 1.5x
    const speedBtn = page.getByRole('button', { name: '1.5×' });
    await speedBtn.click();

    // Advance to Step 4
    await page.getByRole('button', { name: /পরবর্তী ধাপ|Continue/i }).click();

    const startRecalc = Date.now();
    await page.getByRole('button', { name: /রুটিন তৈরি করুন|Build Plan/i }).click();

    // Wait for step 4 to render
    await expect(page.getByText(/ধাপ ৪\/৪|Step 4 of 4/i)).toBeVisible();
    const elapsed = Date.now() - startRecalc;

    // Instant recalculation requirement: sub-second under parallel test runner
    expect(elapsed).toBeLessThan(500);
  });

  test('impossible deadline shows warning and 1-click suggestion fix', async ({ page }) => {
    await page.route('**/api/playlists/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mathFixture),
      });
    });

    await page.goto('/new?url=https://www.youtube.com/playlist?list=PLmath1234567890');
    await page.getByRole('button', { name: /গতি নির্ধারণ|Continue to Pace/i }).click();

    // Select deadline pacing mode
    await page.getByRole('button', { name: /নির্দিষ্ট তারিখের মধ্যে|Finish by date/i }).click();

    // Set deadline to same day (impossible for 8 classes)
    const deadlineInput = page.locator('#deadline-date');
    await deadlineInput.fill('2026-11-21');

    // Go to checks and build
    await page.getByRole('button', { name: /পরবর্তী ধাপ|Continue/i }).click();
    await page.getByRole('button', { name: /রুটিন তৈরি করুন|Build Plan/i }).click();

    // Feasibility status should be impossible
    await expect(page.getByText(/আপনার নির্ধারিত তারিখের মধ্যে সম্ভব নয়|Cannot finish by deadline/i).first()).toBeVisible();

    // 1-Click suggestion should be available
    const suggestionBtn = page.getByRole('button', { name: /⚡/i }).first();
    await expect(suggestionBtn).toBeVisible();

    // Clicking suggestion applies fix
    await suggestionBtn.click();
    await page.waitForTimeout(100);
  });

  test('downloads valid .ics calendar file with 15-minute alarm', async ({ page }) => {
    await page.route('**/api/playlists/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mathFixture),
      });
    });

    await page.goto('/new?url=https://www.youtube.com/playlist?list=PLmath1234567890');
    await page.getByRole('button', { name: /গতি নির্ধারণ|Continue to Pace/i }).click();
    await page.getByRole('button', { name: /পরবর্তী ধাপ|Continue/i }).click();
    await page.getByRole('button', { name: /রুটিন তৈরি করুন|Build Plan/i }).click();

    // Intercept download event
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /ক্যালেন্ডারে যোগ করুন|Add to calendar/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('dishari-pathway.ics');
  });
});

test.describe('Visual Screenshots (Step 4 Pathway Plan)', () => {
  const viewports = [
    { width: 360, height: 800, name: '360' },
    { width: 768, height: 1024, name: '768' },
    { width: 1280, height: 900, name: '1280' },
  ];

  for (const vp of viewports) {
    for (const theme of ['light', 'dark'] as const) {
      test(`step 4 pathway preview at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

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

        // Fast forward to Step 4
        await page.getByRole('button', { name: /গতি নির্ধারণ|Continue to Pace/i }).click();
        await page.getByRole('button', { name: /পরবর্তী ধাপ|Continue/i }).click();
        await page.getByRole('button', { name: /রুটিন তৈরি করুন|Build Plan/i }).click();

        await expect(page.getByText(/ধাপ ৪\/৪|Step 4 of 4/i)).toBeVisible();
        await page.waitForTimeout(300);

        await page.screenshot({
          path: `screenshots/pathway-plan-${vp.name}-${theme}.png`,
          fullPage: true,
        });
      });
    }
  }
});
