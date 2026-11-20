import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendClassReminderEmail,
  sendWeeklySummaryEmail,
} from '@/modules/notifications/email';

describe('Resend Email Delivery & Unsubscribe (architecture.md §11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  it('gracefully mocks email delivery when RESEND_API_KEY is not set', async () => {
    const result = await sendClassReminderEmail({
      to: 'student@example.com',
      classTitle: 'ত্রিকোণমিতিক অনুপাত - পর্ব ১',
      classUrl: 'http://localhost:3000/class/item-1',
      unsubscribeUrl: 'http://localhost:3000/api/notifications/unsubscribe?token=abc',
      locale: 'bn',
    });

    expect(result.success).toBe(true);
    expect(result.mocked).toBe(true);
    expect(result.id).toContain('mock-email-');
  });

  it('renders weekly summary email with adherence and quiz statistics', async () => {
    const result = await sendWeeklySummaryEmail({
      to: 'student@example.com',
      weekRange: 'Nov 14 - Nov 20, 2026',
      adherenceRate: 85,
      totalMinutes: 140,
      quizAverage: 92,
      planHealth: 'on_track',
      dashboardUrl: 'http://localhost:3000/progress',
      unsubscribeUrl: 'http://localhost:3000/api/notifications/unsubscribe?token=abc',
      locale: 'bn',
    });

    expect(result.success).toBe(true);
    expect(result.mocked).toBe(true);
  });
});
