import { describe, it, expect, vi } from 'vitest';
import { sendRemindersJob } from '@/modules/notifications/jobs';

describe('Reminder Worker Jobs (architecture.md §11)', () => {
  it('skips reminders that fall during quiet hours', async () => {
    // 23:30 Dhaka time is quiet hours
    const lateNightIso = '2026-11-20T17:30:00.000Z';

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === 'reminders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'rem-1',
                        user_id: 'user-1',
                        plan_item_id: 'item-1',
                        channel: 'push',
                        send_at: lateNightIso,
                        status: 'pending',
                        plan_items: {
                          id: 'item-1',
                          video_id: 'vid-1',
                          videos: { title: 'গণিত ক্লাস ১' },
                        },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
            update: mockUpdate,
          };
        }
        if (table === 'notification_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    user_id: 'user-1',
                    push_enabled: true,
                    email_enabled: true,
                    quiet_hours_start: '22:00',
                    quiet_hours_end: '07:00',
                  },
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { timezone: 'Asia/Dhaka', locale: 'bn' },
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        };
      }),
    };

    const result = await sendRemindersJob(mockSupabase, lateNightIso);

    expect(result.processedCount).toBe(1);
    expect(result.skippedQuietHoursCount).toBe(1);
    expect(result.sentCount).toBe(0);
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'skipped_quiet_hours' });
  });
});
