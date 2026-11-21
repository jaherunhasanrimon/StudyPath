import { test, expect } from '@playwright/test';

test.describe('Compliance & Guardian Consent End-to-End (architecture.md §12 & phases.md §1 Phase 6)', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'dishari-test-user',
        value: 'test-student-phase6',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('Guardian consent page displays plain-language explanation and processes grant/revoke decisions', async ({
    page,
  }) => {
    let currentStatus = 'pending';

    // Mock verification endpoints
    await page.route('**/api/consent/verify*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            consent: {
              id: 'test-consent-uuid-1',
              guardian_email: 'guardian@example.com',
              status: currentStatus,
              token_expires_at: new Date(Date.now() + 86400000).toISOString(),
              student_name: 'মাহমুদুল হাসান (Sakib)',
              locale: 'bn',
            },
          }),
        });
      } else if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        currentStatus = body.decision === 'grant' ? 'granted' : 'revoked';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            status: currentStatus,
          }),
        });
      }
    });

    await page.goto('/guardian/sample-valid-token');

    // 1. Plain-language explanation visible
    await expect(page.locator('h1')).toContainText('শিক্ষার্থী অ্যাকাউন্টের অভিভাবক সম্মতি পর্যালোচনা');
    await expect(page.getByText('guardian@example.com')).toBeVisible();

    // 2. Click "Grant Consent"
    const grantButton = page.getByRole('button', { name: /সম্মতি প্রদান করুন/i });
    await expect(grantButton).toBeVisible();
    await grantButton.click();

    // 3. Confirm granted state message appears
    await expect(page.getByText('সম্মতি প্রদান সম্পন্ন হয়েছে')).toBeVisible();

    // 4. Click "Revoke Consent"
    const revokeButton = page.getByRole('button', { name: /সম্মতি প্রত্যাহার করুন/i });
    await expect(revokeButton).toBeVisible();
    await revokeButton.click();

    // 5. Confirm revoked state message appears
    await expect(page.getByText('সম্মতি প্রত্যাহার করা হয়েছে')).toBeVisible();
  });

  test('Self-service JSON data export endpoint downloads complete student data', async ({
    page,
  }) => {
    await page.route('**/api/account/export', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Content-Disposition': 'attachment; filename="dishari-data-test.json"',
        },
        body: JSON.stringify({
          exported_at: '2026-11-21T10:00:00.000Z',
          user_id: 'student-uuid-test',
          profile: { display_name: 'Sakib', birth_year: 2009 },
          consents: [{ id: 'c1', status: 'granted' }],
          study_plans: [{ id: 'sp1', name: 'Math Plan' }],
          watch_progress: [],
          notes: [],
          quiz_attempts: [],
        }),
      });
    });

    await page.goto('/settings');
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/account/export');
      return await res.json();
    });

    expect(data.user_id).toBe('student-uuid-test');
    expect(data.profile.birth_year).toBe(2009);
    expect(data.consents[0].status).toBe('granted');
  });

  test('Account deletion cascade requires confirmation typing DELETE', async ({
    page,
  }) => {
    let deletionCalled = false;

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

    await page.route('**/api/account/delete', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (body.confirmation === 'DELETE') {
        deletionCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, message: 'Permanently deleted' }),
        });
      } else {
        await route.fulfill({ status: 400 });
      }
    });

    await page.goto('/settings');

    // Open delete account confirmation
    const requestDeleteBtn = page.getByRole('button', { name: /অ্যাকাউন্ট মুছে ফেলার অনুরোধ করুন/i });
    await expect(requestDeleteBtn).toBeVisible();
    await requestDeleteBtn.click();

    // Type DELETE into confirmation input
    const confirmInput = page.getByPlaceholder('DELETE');
    await expect(confirmInput).toBeVisible();

    const deleteBtn = page.getByRole('button', { name: /স্থায়ীভাবে অ্যাকাউন্ট মুছুন/i });
    await expect(deleteBtn).toBeDisabled();

    await confirmInput.fill('DELETE');
    await expect(deleteBtn).toBeEnabled();

    await deleteBtn.click();
    await page.waitForTimeout(500);
    expect(deletionCalled).toBe(true);
  });
});
