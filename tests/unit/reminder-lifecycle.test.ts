import { describe, it, expect } from 'vitest';
import {
  computeReminderSendTime,
} from '@/modules/notifications/scheduler';

describe('Reminder Lifecycle Scheduler (phases.md §1 Phase 5)', () => {
  const timezone = 'Asia/Dhaka';

  it('computes reminder send time 30 minutes before scheduled time outside quiet hours', () => {
    // Scheduled for 16:00 Dhaka on 2026-11-20
    // 30 min lead -> 15:30 Dhaka
    // 15:30 Dhaka = 09:30 UTC
    const result = computeReminderSendTime({
      scheduledDate: '2026-11-20',
      scheduledTime: '16:00',
      leadMinutes: 30,
      quietStart: '22:00',
      quietEnd: '07:00',
      timezone,
    });

    expect(result.sendAtIso).toBe('2026-11-20T09:30:00.000Z');
    expect(result.wasAdjusted).toBe(false);
  });

  it('adjusts reminder to 07:00 morning if 30-min lead time falls into quiet hours', () => {
    // Scheduled for 22:15 Dhaka on 2026-11-20
    // 30 min lead -> 21:45 Dhaka (outside quiet hours, no adjustment)
    const normal = computeReminderSendTime({
      scheduledDate: '2026-11-20',
      scheduledTime: '22:15',
      leadMinutes: 30,
      quietStart: '22:00',
      quietEnd: '07:00',
      timezone,
    });
    expect(normal.wasAdjusted).toBe(false);

    // Scheduled for 22:45 Dhaka on 2026-11-20
    // 30 min lead -> 22:15 Dhaka (inside quiet hours 22:00-07:00!)
    // Must be adjusted to 07:00 morning next day (2026-11-21 07:00 Dhaka = 2026-11-21 01:00 UTC)
    const adjusted = computeReminderSendTime({
      scheduledDate: '2026-11-20',
      scheduledTime: '22:45',
      leadMinutes: 30,
      quietStart: '22:00',
      quietEnd: '07:00',
      timezone,
    });

    expect(adjusted.wasAdjusted).toBe(true);
    expect(adjusted.sendAtIso).toBe('2026-11-21T01:00:00.000Z');
  });

  it('uses default 10:00 morning class time when scheduledTime is not explicitly provided', () => {
    // Default class time 10:00 Dhaka -> 30m lead -> 09:30 Dhaka (03:30 UTC)
    const result = computeReminderSendTime({
      scheduledDate: '2026-11-20',
      scheduledTime: null,
      leadMinutes: 30,
      quietStart: '22:00',
      quietEnd: '07:00',
      timezone,
    });

    expect(result.sendAtIso).toBe('2026-11-20T03:30:00.000Z');
    expect(result.wasAdjusted).toBe(false);
  });
});
