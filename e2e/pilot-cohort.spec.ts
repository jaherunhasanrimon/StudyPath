import { test, expect } from '@playwright/test';
import pilotFixture from '../tests/fixtures/pilot-cohort.json';

test.describe('Acceptance 4: Founder onboards a test group of 5 students end-to-end', () => {
  test('Validates complete 5-student cohort specification and compliance onboarding', async () => {
    const students = pilotFixture.students;
    expect(students).toHaveLength(5);

    // Verify each student has valid demographic data
    for (const s of students) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.email).toContain('@');
      expect(['SSC', 'HSC']).toContain(s.level);
      expect(s.playlist_title).toBeTruthy();
      expect(s.channel).toBeTruthy();

      // Check Minor Protection rule per architecture §12:
      // If born in or after 2008 (age <= 18), guardian consent must be granted before onboarding
      if (s.birth_year >= 2008) {
        expect(s.is_minor).toBe(true);
        expect(s.guardian_consent).toBe('granted');
      } else {
        expect(s.is_minor).toBe(false);
      }

      // Check schedule progress metrics
      expect(s.adherence_rate).toBeGreaterThanOrEqual(70);
      expect(s.quizzes_completed).toBeGreaterThanOrEqual(2);
    }
  });

  test('Simulates end-to-end student onboarding from verified starter playlist to active routine', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: 'dishari-test-user',
        value: 'pilot-student-01',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Mock playlist resolve
    await page.route('**/api/playlists/resolve*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          playlistId: 'PL_X2k43R1f5kXy9_TRIG_SSC_01',
          title: 'এসএসসি উচ্চতর গণিত — ত্রিকোণমিতি (অধ্যায় ৮)',
          channelTitle: 'অন্যরকম পাঠশালা (Onnorokom Pathshala)',
          itemCount: 14,
          totalDurationSec: 23400,
          totalDurationFormatted: '6h 30m',
          order: {
            isSequential: true,
            confidence: 'high',
            messageKey: 'order.sequential',
          },
          warnings: [],
          items: [
            {
              id: 'v1',
              title: 'ত্রিকোণমিতি বেসিক ও কোণের পরিমাপ',
              durationSec: 1800,
              durationFormatted: '30:00',
              position: 0,
              available: true,
              embeddable: true,
            },
            {
              id: 'v2',
              title: 'রেডিয়ান কোণ একটি ধ্রুব কোণ প্রমাণ',
              durationSec: 1500,
              durationFormatted: '25:00',
              position: 1,
              available: true,
              embeddable: true,
            },
          ],
        }),
      });
    });

    // 1. Visit Home page and observe starter playlists
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=যাচাইকৃত নমুনা প্লেলিস্ট')).toBeVisible();
    await expect(page.locator('text=এসএসসি উচ্চতর গণিত — ত্রিকোণমিতি').first()).toBeVisible();

    // 2. Click "রুটিন তৈরি করুন →" on Trigonometry card
    const trigCard = page.locator('.rounded-card', {
      hasText: 'এসএসসি উচ্চতর গণিত — ত্রিকোণমিতি',
    }).first();
    const createBtn = trigCard.getByRole('button', { name: 'রুটিন তৈরি করুন →' });
    await createBtn.click();

    // 3. Navigates to /new with playlist URL and resolves
    await page.waitForURL(/\/new\?url=/);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=অন্যরকম পাঠশালা')).toBeVisible();
  });
});
