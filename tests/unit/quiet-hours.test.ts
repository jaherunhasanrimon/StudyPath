import { describe, it, expect } from 'vitest';
import {
  isQuietHour,
  adjustForQuietHours,
  parseQuietHourTime,
} from '@/modules/notifications/quiet-hours';

describe('Quiet Hours Enforcement (architecture.md §11 & phases.md §1)', () => {
  const defaultTz = 'Asia/Dhaka';

  it('parses valid HH:mm time strings correctly', () => {
    expect(parseQuietHourTime('22:00')).toEqual({ hour: 22, minute: 0 });
    expect(parseQuietHourTime('07:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseQuietHourTime('invalid')).toEqual({ hour: 22, minute: 0 }); // fallback
  });

  it('detects timestamps during cross-midnight quiet hours (22:00 to 07:00)', () => {
    // 23:30 Asia/Dhaka is in quiet hours (UTC: 17:30)
    const lateNightUtc = '2026-11-20T17:30:00.000Z'; // 23:30 Dhaka
    expect(isQuietHour(lateNightUtc, '22:00', '07:00', defaultTz)).toBe(true);

    // 03:15 Asia/Dhaka is in quiet hours (UTC: 21:15 previous day)
    const earlyMorningUtc = '2026-11-19T21:15:00.000Z'; // 03:15 Dhaka
    expect(isQuietHour(earlyMorningUtc, '22:00', '07:00', defaultTz)).toBe(true);

    // 06:59 Asia/Dhaka is still quiet hours
    const rightBeforeEndUtc = '2026-11-20T00:59:00.000Z'; // 06:59 Dhaka
    expect(isQuietHour(rightBeforeEndUtc, '22:00', '07:00', defaultTz)).toBe(true);
  });

  it('permits daytime timestamps outside quiet hours', () => {
    // 07:01 Asia/Dhaka is daytime
    const morningUtc = '2026-11-20T01:01:00.000Z'; // 07:01 Dhaka
    expect(isQuietHour(morningUtc, '22:00', '07:00', defaultTz)).toBe(false);

    // 15:00 Asia/Dhaka is daytime
    const afternoonUtc = '2026-11-20T09:00:00.000Z'; // 15:00 Dhaka
    expect(isQuietHour(afternoonUtc, '22:00', '07:00', defaultTz)).toBe(false);

    // 21:59 Asia/Dhaka is daytime (just before quiet hours start at 22:00)
    const eveningUtc = '2026-11-20T15:59:00.000Z'; // 21:59 Dhaka
    expect(isQuietHour(eveningUtc, '22:00', '07:00', defaultTz)).toBe(false);
  });

  it('adjusts quiet-hour timestamps to the end of quiet hours (07:00 next morning)', () => {
    // If a class is scheduled late at night (e.g. 23:30), the 30-min lead reminder is at 23:00 (quiet hours)
    // adjustForQuietHours shifts it to 07:00:00
    const lateNightUtc = '2026-11-20T17:30:00.000Z'; // 23:30 Dhaka
    const adjusted = adjustForQuietHours(lateNightUtc, '22:00', '07:00', defaultTz);

    expect(adjusted.wasAdjusted).toBe(true);
    // Adjusted timestamp in Dhaka should be 07:00:00 next morning (2026-11-21 07:00 Dhaka = 2026-11-21 01:00:00 UTC)
    expect(adjusted.adjustedIso).toBe('2026-11-21T01:00:00.000Z');
  });

  it('returns original timestamp when timestamp is already outside quiet hours', () => {
    const afternoonUtc = '2026-11-20T09:00:00.000Z'; // 15:00 Dhaka
    const adjusted = adjustForQuietHours(afternoonUtc, '22:00', '07:00', defaultTz);

    expect(adjusted.wasAdjusted).toBe(false);
    expect(adjusted.adjustedIso).toBe(afternoonUtc);
  });
});
