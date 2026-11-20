/**
 * Capture screenshots for the Phase 0 walkthrough.
 * Run with: pnpm exec playwright test e2e/screenshots.spec.ts
 */
import { test } from '@playwright/test';

const viewports = [
  { width: 360, height: 800, name: '360' },
  { width: 768, height: 1024, name: '768' },
  { width: 1280, height: 900, name: '1280' },
];

const pages = [
  { path: '/design', name: 'design' },
  { path: '/auth/sign-in', name: 'sign-in' },
  { path: '/', name: 'home' },
];

for (const pg of pages) {
  for (const vp of viewports) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${pg.name} at ${vp.name}px ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Set theme via localStorage before navigation
        await page.addInitScript((t: string) => {
          localStorage.setItem('dishari-theme', t);
        }, theme);

        await page.goto(`http://localhost:3000${pg.path}`);
        await page.waitForLoadState('networkidle');

        // Wait a bit for fonts and rendering
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `screenshots/${pg.name}-${vp.name}-${theme}.png`,
          fullPage: true,
        });
      });
    }
  }
}
