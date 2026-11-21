import { test } from '@playwright/test';
import path from 'node:path';

const viewports = [
  { width: 360, height: 800, name: '360' },
  { width: 768, height: 1024, name: '768' },
  { width: 1280, height: 900, name: '1280' },
];

test.describe('Phase 6 Responsive Compliance Screenshots', () => {
  for (const vp of viewports) {
    for (const theme of ['light', 'dark'] as const) {
      test(`Privacy Policy at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

        await page.goto('/privacy');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join('docs/screenshots', `privacy-${vp.name}-${theme}.png`),
          fullPage: true,
        });
      });

      test(`Guardian Review at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

        await page.route('**/api/consent/verify*', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              consent: {
                id: 'test-consent-uuid-1',
                guardian_email: 'guardian@example.com',
                status: 'pending',
                token_expires_at: new Date(Date.now() + 86400000).toISOString(),
                student_name: 'মাহমুদুল হাসান (Sakib)',
                locale: 'bn',
              },
            }),
          });
        });

        await page.goto('/guardian/sample-token');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join('docs/screenshots', `guardian-${vp.name}-${theme}.png`),
          fullPage: true,
        });
      });

      test(`Settings Data & Deletion at ${vp.name}px ${theme}`, async ({ context, page }) => {
        await context.addCookies([
          {
            name: 'dishari-test-user',
            value: 'test-student-phase6',
            domain: 'localhost',
            path: '/',
          },
        ]);

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

        await page.route('**/api/notifications/preferences', async (route) => {
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
        await page.waitForLoadState('networkidle');

        // Open the delete dialog so the screenshot captures confirmation flow
        const reqBtn = page.getByRole('button', { name: /অ্যাকাউন্ট মুছে ফেলার অনুরোধ করুন/i });
        if (await reqBtn.isVisible()) {
          await reqBtn.click();
        }
        await page.waitForTimeout(300);

        await page.screenshot({
          path: path.join('docs/screenshots', `settings-privacy-${vp.name}-${theme}.png`),
          fullPage: true,
        });
      });
    }
  }
});
