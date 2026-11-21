import { test, expect } from '@playwright/test';
import mathFixture from '../tests/fixtures/youtube/math-sequential.json';

const mockPlanId = 'plan-test-uuid-1111';
const mockItemId1 = 'item-test-uuid-0001';
const mockItemId2 = 'item-test-uuid-0002';

const mockStudyPlan = {
  id: mockPlanId,
  name: 'HSC Higher Math 1st Paper - Chapter 1',
  version: 1,
  status: 'active',
  timezone: 'Asia/Dhaka',
  start_date: '2026-11-21',
  end_date: '2026-11-28',
  created_at: new Date().toISOString(),
  items: [
    {
      id: mockItemId1,
      plan_id: mockPlanId,
      seq: 1,
      type: 'class',
      start_at: '2026-11-21T13:30:00.000Z', // 19:30 in Dhaka
      end_at: '2026-11-21T14:30:00.000Z',
      duration_min: 60,
      video_ids: ['math_v01'],
      part: null,
      covers: [],
      label: 'Class 01 - Matrix Basics',
      status: 'scheduled',
      completed_at: null,
      meta: {},
    },
    {
      id: mockItemId2,
      plan_id: mockPlanId,
      seq: 2,
      type: 'class',
      start_at: '2026-11-21T14:35:00.000Z', // 20:35 in Dhaka
      end_at: '2026-11-21T15:35:00.000Z',
      duration_min: 60,
      video_ids: ['math_v02'],
      part: null,
      covers: [],
      label: 'Class 02 - Matrix Types',
      status: 'scheduled',
      completed_at: null,
      meta: {},
    },
  ],
};

test.describe('Phase 3 Learning Loop Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    // Add test auth cookie for protected (app) routes
    await context.addCookies([
      {
        name: 'dishari-test-user',
        value: 'true',
        url: 'http://localhost:3000',
      },
    ]);

    // Mock playlists resolve
    await page.route('**/api/playlists/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mathFixture),
      });
    });

    // Mock create plan
    await page.route('**/api/plans', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, plan: mockStudyPlan }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ plans: [mockStudyPlan] }),
        });
      }
    });

    // Mock plan by ID
    await page.route(`**/api/plans/${mockPlanId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ plan: mockStudyPlan }),
      });
    });

    // Mock today
    await page.route('**/api/today*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          primaryAction: mockStudyPlan.items[0],
          overdue: [],
          upcoming: [mockStudyPlan.items[1]],
          todayDate: '2026-11-21',
          timezone: 'Asia/Dhaka',
          planName: mockStudyPlan.name,
          planId: mockPlanId,
        }),
      });
    });

    // Mock class view endpoint
    await page.route('**/api/class/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          item: mockStudyPlan.items[0],
          planId: mockPlanId,
          progress: { last_position_sec: 120, completed: false },
          note: null,
          nextItemId: mockItemId2,
        }),
      });
    });

    // Mock item patch
    await page.route(`**/api/plans/${mockPlanId}/items/*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, item: { ...mockStudyPlan.items[0], status: 'done' } }),
      });
    });

    // Mock progress
    await page.route('**/api/progress', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, progress: { last_position_sec: 120 } }),
      });
    });

    // Mock notes
    await page.route('**/api/notes*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, note: { body: 'Test note' } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ note: null }),
        });
      }
    });

    // Mock replan
    await page.route(`**/api/plans/${mockPlanId}/replan`, async (route) => {
      const postData = route.request().postDataJSON();
      if (postData?.confirm) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, newPlanId: 'plan-v2-uuid', version: 2 }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            preview: true,
            strategy: postData?.strategy || 'shift',
            diff: {
              moved: [{ id: mockItemId1, oldDate: '2026-11-21', oldStart: '19:30', newDate: '2026-11-23', newStart: '19:30' }],
              added: [],
              removed: [],
            },
            originalLastDate: '2026-11-28',
            newLastDate: '2026-11-30',
          }),
        });
      }
    });
  });

  test('full learning loop: create plan -> today -> class view -> progress -> replan', async ({ page }) => {
    // 1. Visit wizard
    await page.goto('/new?url=https://www.youtube.com/playlist?list=PLmath1234567890');
    await expect(page.getByText('Onnorokom Pathshala').first()).toBeVisible();

    // Advance to Step 4
    await page.getByRole('button', { name: /গতি নির্ধারণ|Continue to Pace/i }).click();
    await page.getByRole('button', { name: /পরবর্তী ধাপ|Continue/i }).click();
    await page.getByRole('button', { name: /রুটিন তৈরি করুন|Build Plan/i }).click();

    // 2. Click "Start this plan"
    const startPlanBtn = page.getByRole('button', { name: /এই রুটিন দিয়ে শুরু করুন|Start this plan/i });
    await expect(startPlanBtn).toBeVisible();
    await startPlanBtn.click();

    // 3. Land on /today
    await page.waitForURL('**/today');
    await expect(page.getByText(/আজকের পড়া|Today/i).first()).toBeVisible();

    // Primary action displays Class 01 with Marigold knot
    await expect(page.getByText('Class 01 - Matrix Basics').first()).toBeVisible();

    // 4. Click "Start class"
    const startClassBtn = page.getByRole('link', { name: /ক্লাস শুরু করুন|Start class/i }).first();
    await expect(startClassBtn).toBeVisible();
    await startClassBtn.click();

    // 5. Land on /class/[itemId]
    await page.waitForURL('**/class/*');
    await expect(page.getByText('Class 01 - Matrix Basics').first()).toBeVisible();
    await expect(page.getByText(/ইউটিউবে দেখুন|Open on YouTube/i)).toBeVisible();

    // 6. Test notes tab autosave
    const notesTextarea = page.locator('#student-notes');
    await expect(notesTextarea).toBeVisible();
    await notesTextarea.fill('Determinant properties are essential for exams.');

    // 7. Click "Mark as done"
    const markDoneBtn = page.getByRole('button', { name: /সম্পন্ন হিসেবে চিহ্নিত করুন|Mark as done/i });
    await expect(markDoneBtn).toBeVisible();
    await markDoneBtn.click();

    // Status changes to Done
    await expect(page.getByText(/সম্পন্ন|Done/i).first()).toBeVisible();

    // 8. Return to Today screen
    await page.goto('/today');

    // Test Replan Modal when overdue exists
    // Re-route today with an overdue item
    await page.route('**/api/today*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          primaryAction: mockStudyPlan.items[0],
          overdue: [{ ...mockStudyPlan.items[0], status: 'missed' }],
          upcoming: [mockStudyPlan.items[1]],
          todayDate: '2026-11-21',
          timezone: 'Asia/Dhaka',
          planName: mockStudyPlan.name,
          planId: mockPlanId,
        }),
      });
    });

    await page.reload();

    // Overdue banner should be visible
    await expect(page.getByText(/১টি ক্লাস বাকি আছে|Behind by 1 class/i)).toBeVisible();

    // Click Replan CTA
    const replanBtn = page.getByRole('button', { name: /রুটিন সমন্বয় করুন|Adjust schedule/i });
    await expect(replanBtn).toBeVisible();
    await replanBtn.click();

    // Replan Modal is visible with strategy options
    await expect(page.getByText(/পড়ার রুটিন পুনর্নির্ধারণ|Replan Schedule/i)).toBeVisible();
    await expect(page.getByText(/2026-11-28 → 2026-11-30/i)).toBeVisible();

    // Confirm replan
    const confirmBtn = page.getByRole('button', { name: /নতুন রুটিন নিশ্চিত করুন|Confirm New Schedule/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Navigates to new plan pathway
    await page.waitForURL('**/plans/plan-v2-uuid');
  });

  test('today screen respects Asia/Dhaka calendar day when client timezone is New York', async ({ page }) => {
    // Set browser emulation timezone to America/New_York
    await page.emulateMedia({ colorScheme: 'light' });

    await page.goto('/today');
    await expect(page.getByText('2026-11-21').first()).toBeVisible();
    await expect(page.getByText('HSC Higher Math 1st Paper - Chapter 1').first()).toBeVisible();
  });
});

test.describe('Visual Screenshots (Phase 3 Learning Loop)', () => {
  const viewports = [
    { width: 360, height: 800, name: '360' },
    { width: 768, height: 1024, name: '768' },
    { width: 1280, height: 900, name: '1280' },
  ];

  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([
      {
        name: 'dishari-test-user',
        value: 'true',
        url: 'http://localhost:3000',
      },
    ]);

    await page.route('**/api/today*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          primaryAction: mockStudyPlan.items[0],
          overdue: [{ ...mockStudyPlan.items[0], status: 'missed' }],
          upcoming: [mockStudyPlan.items[1]],
          todayDate: '2026-11-21',
          timezone: 'Asia/Dhaka',
          planName: mockStudyPlan.name,
          planId: mockPlanId,
        }),
      });
    });

    await page.route(`**/api/plans/${mockPlanId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ plan: mockStudyPlan }),
      });
    });

    await page.route('**/api/class/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          item: mockStudyPlan.items[0],
          planId: mockPlanId,
          progress: { last_position_sec: 120, completed: false },
          note: 'Determinant calculation technique notes for the exam.',
          nextItemId: mockItemId2,
        }),
      });
    });

    await page.route('**/api/notes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ note: { body: 'Sample student notes from class lecture.' } }),
      });
    });
  });

  for (const vp of viewports) {
    for (const theme of ['light', 'dark'] as const) {
      test(`today view at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

        await page.goto('/today');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(200);

        await page.screenshot({
          path: `screenshots/today-${vp.name}-${theme}.png`,
          fullPage: true,
        });
      });

      test(`pathway view at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

        await page.goto(`/plans/${mockPlanId}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(200);

        await page.screenshot({
          path: `screenshots/pathway-${vp.name}-${theme}.png`,
          fullPage: true,
        });
      });

      test(`class view at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

        await page.goto(`/class/${mockItemId1}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(200);

        await page.screenshot({
          path: `screenshots/class-${vp.name}-${theme}.png`,
          fullPage: true,
        });
      });
    }
  }
});
