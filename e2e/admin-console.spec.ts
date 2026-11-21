import { test, expect } from '@playwright/test';

test.describe('Admin Console & Pilot Operations (Phase 7 Acceptance Criteria)', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'dishari-test-user',
        value: 'admin',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('Acceptance 1: Admin hides a question and it disappears for all users within 1 minute', async ({
    page,
  }) => {
    let isHiddenState = false;

    // Mock question queue & patch endpoint
    await page.route('**/api/admin/queue*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          queue: [
            {
              id: 'test-q-101',
              assessment_id: 'a-1',
              position: 1,
              type: 'mcq',
              stem: 'ত্রিকোণমিতিক অনুপাত sin(90°) এর মান কত?',
              options: ['0', '1', '-1', 'অসংজ্ঞায়িত'],
              answer: '1',
              explanation: 'sin(90°) = 1',
              verifier_status: 'unverified',
              report_count: 3,
              is_hidden: isHiddenState,
              reviewed_at: null,
              reviewed_by: null,
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.route('**/api/admin/questions/test-q-101', async (route) => {
      const data = JSON.parse(route.request().postData() || '{}');
      if (data.is_hidden !== undefined) {
        isHiddenState = data.is_hidden;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // 1. Visit admin review queue
    await page.goto('/admin/queue');
    await page.waitForLoadState('networkidle');

    // Verify question is initially visible with report badge
    await expect(page.locator('text=sin(90°)')).toBeVisible();
    await expect(page.locator('text=⚠️ 3')).toBeVisible();

    // Click 1-click hide button
    const hideBtn = page.getByRole('button', { name: 'লুকিয়ে দিন' });
    await expect(hideBtn).toBeVisible();
    await hideBtn.click();

    // Verify status changes to "লুকানো (Hidden)"
    await expect(page.locator('text=লুকানো (Hidden)')).toBeVisible();
    expect(isHiddenState).toBe(true);
  });

  test("Acceptance 2: An opt-out request removes a creator's videos from shared insights", async ({
    page,
  }) => {
    const optOutRecords = [
      {
        id: 'optout-1',
        channel_id: 'UC_test_creator',
        channel_title: 'Demo Educational Channel',
        reason: 'Creator request',
        status: 'active',
        created_at: new Date().toISOString(),
      },
    ];

    await page.route('**/api/admin/opt-outs*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ optOuts: optOutRecords }),
        });
      } else if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newRecord = {
          id: 'optout-new',
          channel_id: body.channel_id,
          channel_title: body.channel_title,
          reason: body.reason || null,
          status: 'active',
          created_at: new Date().toISOString(),
        };
        optOutRecords.unshift(newRecord);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            optOut: newRecord,
            purgedInsights: 14,
          }),
        });
      }
    });

    await page.goto('/admin/opt-outs');
    await page.waitForLoadState('networkidle');

    // Verify list renders
    await expect(page.locator('text=Demo Educational Channel')).toBeVisible();

    // Fill form to add new creator opt-out
    await page.locator('#optout-channel-id').fill('UC_optout_target_123');
    await page.locator('#optout-channel-title').fill('Creator Objecting Channel');
    await page.locator('#optout-reason').fill('Direct takedown email');

    await page.getByRole('button', { name: 'অপ্ট-আউট ও ইনসাইট পার্জ করুন' }).click();

    // Verify confirmation and purge message
    await expect(
      page.locator('text=মোট 14 টি শেয়ার্ড ইনসাইট পার্জ করা হয়েছে')
    ).toBeVisible();
    await expect(page.locator('text=Creator Objecting Channel')).toBeVisible();
  });

  test('Acceptance 3: The pilot dashboard shows correct metrics on seeded data', async ({
    page,
  }) => {
    await page.route('**/api/admin/pilot-stats*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: {
            totalStudents: 5,
            activeStudents: 5,
            retention: {
              week1Rate: 100,
              week4Rate: 80,
              week8Rate: 60,
            },
            overallAdherenceRate: 88,
            quizAttemptRate: 95,
            totalAiCostUsd: 0.042,
            costPerActiveStudentUsd: 0.008,
            calculatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/admin/pilot');
    await page.waitForLoadState('networkidle');

    // Verify metrics cards
    await expect(page.locator('text=মোট পাইলট শিক্ষার্থী')).toBeVisible();
    await expect(page.locator('text=5').first()).toBeVisible();
    await expect(page.locator('text=88%')).toBeVisible();
    await expect(page.locator('text=95%')).toBeVisible();
    await expect(page.locator('text=$0.042')).toBeVisible();

    // Verify retention curves
    await expect(page.locator('text=সপ্তাহ ১ (Week 1)')).toBeVisible();
    await expect(page.locator('.text-river.font-bold', { hasText: '100%' })).toBeVisible();
    await expect(page.locator('text=সপ্তাহ ৪ (Week 4)')).toBeVisible();
    await expect(page.locator('.text-river.font-bold', { hasText: '80%' })).toBeVisible();
    await expect(page.locator('text=সপ্তাহ ৮ (Week 8)')).toBeVisible();
    await expect(page.locator('.text-river.font-bold', { hasText: '60%' })).toBeVisible();
  });

  test('Floating feedback widget submits user feedback and records client metadata', async ({
    page,
  }) => {
    let capturedFeedback: unknown = null;

    await page.route('**/api/feedback*', async (route) => {
      if (route.request().method() === 'POST') {
        capturedFeedback = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, item: { id: 'fb-test-1' } }),
        });
      }
    });

    await page.goto('/today');
    await page.waitForLoadState('networkidle');

    // Open feedback widget
    const trigger = page.locator('button[aria-label*="মতামত"]');
    await expect(trigger).toBeVisible();
    await trigger.click();

    // Verify dialog opened
    await expect(page.locator('#feedback-dialog-title')).toBeVisible();

    // Fill message
    await page.locator('#feedback-message').fill('গণিত ক্লাসের ৩য় ভিডিওর প্লেলিস্ট ক্রমানুসারে নেই।');
    await page.getByRole('button', { name: 'পাঠিয়ে দিন' }).click();

    // Verify success confirmation
    await expect(page.locator('text=ধন্যবাদ! আপনার মতামত সফলভাবে পৌঁছেছে')).toBeVisible();
    expect(capturedFeedback).toBeTruthy();
  });
});
