import { test } from '@playwright/test';
import path from 'node:path';

const viewports = [
  { width: 360, height: 800, name: '360' },
  { width: 768, height: 1024, name: '768' },
  { width: 1280, height: 900, name: '1280' },
];

test.describe('Phase 7 Responsive Screenshots (Admin Console & Starter Content)', () => {
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

  for (const vp of viewports) {
    for (const theme of ['light', 'dark'] as const) {
      test(`Admin Queue at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

        await page.route('**/api/admin/queue*', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              queue: [
                {
                  id: 'q-demo-1',
                  assessment_id: 'a1',
                  position: 1,
                  type: 'mcq',
                  stem: 'নিউটনের গতির দ্বিতীয় সূত্র থেকে কী পরিমাপ করা যায়?',
                  options: ['বল', 'জড়তা', 'ভরবেগ', 'ত্বরণ'],
                  answer: 'বল',
                  explanation: 'F = ma সমীকরণের সাহায্যে বলের পরিমাপ পাওয়া যায়।',
                  verifier_status: 'unverified',
                  report_count: 2,
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
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join('docs/screenshots', `admin-queue-${vp.name}-${theme}.png`),
          fullPage: true,
        });
      });

      test(`Admin Opt-Outs at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

        await page.goto('/admin/opt-outs');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join('docs/screenshots', `admin-opt-outs-${vp.name}-${theme}.png`),
          fullPage: true,
        });
      });

      test(`Admin Pilot Dashboard at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

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
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join('docs/screenshots', `admin-pilot-${vp.name}-${theme}.png`),
          fullPage: true,
        });
      });

      test(`Home Starter Playlists at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join('docs/screenshots', `starter-playlists-${vp.name}-${theme}.png`),
          fullPage: true,
        });
      });
    }
  }
});
