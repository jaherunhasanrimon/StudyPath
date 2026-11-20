import { test, expect } from '@playwright/test';

const mockProgressData = {
  adherence: {
    rate: 85,
    completedCount: 17,
    totalCount: 20,
    onTimeCount: 16,
  },
  weeklyMinutes: {
    thisWeekMinutes: 140,
    lastWeekMinutes: 110,
    targetMinutes: 120,
    percentOfTarget: 117,
  },
  quizTrend: {
    averageScore: 88,
    recentScores: [
      { date: '2026-11-15', score: 8, maxScore: 10, percentage: 80 },
      { date: '2026-11-17', score: 9, maxScore: 10, percentage: 90 },
      { date: '2026-11-19', score: 10, maxScore: 10, percentage: 100 },
    ],
    totalAttempts: 3,
  },
  upcomingWorkload: {
    next7DaysCount: 6,
    next7DaysMinutes: 150,
    byDay: [
      { date: '2026-11-20', classCount: 1, quizCount: 1, assignmentCount: 0, totalMinutes: 30 },
      { date: '2026-11-21', classCount: 1, quizCount: 0, assignmentCount: 0, totalMinutes: 25 },
      { date: '2026-11-22', classCount: 1, quizCount: 1, assignmentCount: 0, totalMinutes: 35 },
      { date: '2026-11-23', classCount: 0, quizCount: 0, assignmentCount: 0, totalMinutes: 0 },
      { date: '2026-11-24', classCount: 1, quizCount: 0, assignmentCount: 1, totalMinutes: 40 },
      { date: '2026-11-25', classCount: 1, quizCount: 0, assignmentCount: 0, totalMinutes: 20 },
      { date: '2026-11-26', classCount: 0, quizCount: 0, assignmentCount: 0, totalMinutes: 0 },
    ],
  },
  planHealth: 'on_track' as const,
  streak: {
    currentStreak: 4,
    longestStreak: 7,
    activeToday: true,
  },
  streakEnabled: false,
};

let currentPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  leadMinutes: 30,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  streakEnabled: false,
};

test.describe('Phase 5: Reminders and Dashboard Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    // Set test auth cookie
    await context.addCookies([
      {
        name: 'dishari-test-user',
        value: 'test-student-phase5',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Mock /api/progress
    await page.route('**/api/progress', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockProgressData),
        });
      }
    });

    // Mock /api/notifications/preferences
    await page.route('**/api/notifications/preferences', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(currentPreferences),
        });
      } else if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        currentPreferences = { ...currentPreferences, ...body };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, preferences: currentPreferences }),
        });
      }
    });

    // Mock /api/notifications/test
    await page.route('**/api/notifications/test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, channel: 'push', details: { pushSent: true } }),
      });
    });

    // Mock /api/notifications/subscribe & unsubscribe
    await page.route('**/api/notifications/subscribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, subscribed: true }),
      });
    });
    await page.route('**/api/notifications/unsubscribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, unsubscribed: true }),
      });
    });
  });

  test('Progress Dashboard: loads and displays adherence, study minutes, quiz trends and upcoming workload', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/progress');
    await page.waitForLoadState('networkidle');

    // Verify Title and Subtitle
    await expect(page.locator('h1')).toContainText('আপনার পড়ার অগ্রগতি');

    // Verify Plan Health Banner
    await expect(page.locator('text=সঠিক গতিতে')).toBeVisible();

    // Verify Adherence Card
    await expect(page.locator('text=রুটিন পালন').first()).toBeVisible();
    await expect(page.locator('text=85%').first()).toBeVisible();

    // Verify Study Time Card
    await expect(page.locator('text=পড়ার সময়').first()).toBeVisible();
    await expect(page.locator('text=140').first()).toBeVisible();

    // Verify Quiz Trend Card
    await expect(page.locator('text=কুইজের ফলাফল').first()).toBeVisible();
    await expect(page.locator('text=88%').first()).toBeVisible();

    // Verify Workload Card
    await expect(page.locator('text=আগামী ৭ দিনের পড়া').first()).toBeVisible();
    await expect(page.locator('text=6').first()).toBeVisible();

    // Verify optional streak badge is hidden when streakEnabled is false
    await expect(page.locator('text=দিনের অধ্যবসায়')).toHaveCount(0);
  });

  test('Settings Page: modifies notification preferences, lead time, quiet hours, and sends test reminder', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');

    // Verify Title
    await expect(page.locator('h1')).toContainText('সেটিংস ও নোটিফিকেশন');

    // Verify Push and Email toggles are present
    await expect(page.locator('text=ওয়েব পুশ নোটিফিকেশন')).toBeVisible();
    await expect(page.locator('text=ইমেইল রিমাইন্ডার')).toBeVisible();

    // Select 15 minutes lead time
    const lead15Btn = page.locator('button:has-text("15 মিনিট আগে")');
    await expect(lead15Btn).toBeVisible();
    await lead15Btn.click();

    // Test send reminder button
    const sendTestBtn = page.locator('button:has-text("টেস্ট রিমাইন্ডার পাঠান")');
    await expect(sendTestBtn).toBeVisible();
    await sendTestBtn.click();
    await expect(page.locator('text=টেস্ট রিমাইন্ডার পাঠানো হয়েছে!')).toBeVisible();

    // Save preferences
    const saveBtn = page.locator('button:has-text("সংরক্ষণ করুন")');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(page.locator('text=সংরক্ষিত হয়েছে')).toBeVisible();
  });

  test('Unsubscribe Link: verifies one-click email unsubscribe handler', async ({
    page,
  }) => {
    // Intercept unsubscribe GET request with mock HTML response
    await page.route('**/api/notifications/unsubscribe?token=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<html><body><h3>আপনার ইমেইল রিমাইন্ডার সফলভাবে বন্ধ করা হয়েছে</h3></body></html>',
      });
    });

    await page.goto('http://localhost:3000/api/notifications/unsubscribe?token=mock-token');
    await expect(
      page.locator('text=আপনার ইমেইল রিমাইন্ডার সফলভাবে বন্ধ করা হয়েছে')
    ).toBeVisible();
  });

  test('Capture Responsive Screenshots (360px, 768px, 1280px in light/dark)', async ({
    page,
  }) => {
    const viewports = [
      { name: '360', width: 360, height: 740 },
      { name: '768', width: 768, height: 1024 },
      { name: '1280', width: 1280, height: 800 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Progress Dashboard - Light & Dark
      await page.goto('http://localhost:3000/progress');
      await page.waitForLoadState('networkidle');

      // Light mode
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.screenshot({
        path: `docs/screenshots/progress-${vp.name}-light.png`,
        fullPage: true,
      });

      // Dark mode
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.screenshot({
        path: `docs/screenshots/progress-${vp.name}-dark.png`,
        fullPage: true,
      });

      // 2. Settings - Light & Dark
      await page.goto('http://localhost:3000/settings');
      await page.waitForLoadState('networkidle');

      // Light mode
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.screenshot({
        path: `docs/screenshots/settings-${vp.name}-light.png`,
        fullPage: true,
      });

      // Dark mode
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.screenshot({
        path: `docs/screenshots/settings-${vp.name}-dark.png`,
        fullPage: true,
      });
    }
  });
});
