import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit (axe-core WCAG 2.1 AA)', () => {
  test('Home page (/) has no critical or serious accessibility violations', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test('Privacy Policy (/privacy) has no critical or serious accessibility violations', async ({ page }) => {
    await page.goto('/privacy');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test('Terms of Service (/terms) has no critical or serious accessibility violations', async ({ page }) => {
    await page.goto('/terms');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test('Settings page (/settings) has no critical or serious accessibility violations', async ({ page }) => {
    await page.route('/api/notifications/preferences', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          pushEnabled: true,
          emailEnabled: true,
          leadMinutes: 30,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          streakEnabled: false,
        }),
      });
    });

    await page.goto('/settings');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test('Progress dashboard (/progress) has no critical or serious accessibility violations', async ({ page }) => {
    await page.route('/api/progress', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          adherence: { rate: 85, completedCount: 17, totalCount: 20, onTimeCount: 16 },
          weeklyMinutes: { thisWeekMinutes: 140, lastWeekMinutes: 110, targetMinutes: 120, percentOfTarget: 117 },
          quizTrend: {
            averageScore: 88,
            recentScores: [{ date: '2026-11-19', score: 10, maxScore: 10, percentage: 100 }],
            totalAttempts: 1,
          },
          upcomingWorkload: {
            next7DaysCount: 6,
            next7DaysMinutes: 150,
            byDay: [{ date: '2026-11-21', classCount: 1, quizCount: 0, assignmentCount: 0, totalMinutes: 25 }],
          },
          planHealth: 'on_track',
          streak: { currentStreak: 4, bestStreak: 7, lastStudyDate: '2026-11-20' },
          streakEnabled: true,
        }),
      });
    });

    await page.goto('/progress');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test('Creator Opt-Out page (/opt-out) has no critical or serious accessibility violations', async ({ page }) => {
    await page.goto('/opt-out');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test('Admin Queue (/admin/queue) has no critical or serious accessibility violations', async ({ page, context }) => {
    await context.addCookies([
      { name: 'dishari-test-user', value: 'admin', domain: 'localhost', path: '/' },
    ]);
    await page.route('**/api/admin/queue*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          queue: [
            {
              id: 'q1',
              assessment_id: 'a1',
              position: 1,
              type: 'mcq',
              stem: 'Sample Question',
              options: ['A', 'B'],
              answer: 'A',
              explanation: 'Exp',
              verifier_status: 'unverified',
              report_count: 1,
              is_hidden: false,
              reviewed_at: null,
              reviewed_by: null,
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto('/admin/queue');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test('Admin Pilot Dashboard (/admin/pilot) has no critical or serious accessibility violations', async ({ page, context }) => {
    await context.addCookies([
      { name: 'dishari-test-user', value: 'admin', domain: 'localhost', path: '/' },
    ]);
    await page.route('**/api/admin/pilot-stats*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: {
            totalStudents: 5,
            activeStudents: 5,
            retention: { week1Rate: 100, week4Rate: 80, week8Rate: 60 },
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
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
