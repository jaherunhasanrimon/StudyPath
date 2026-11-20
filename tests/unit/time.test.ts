/**
 * Unit tests for lib/time.ts — Luxon date/time helpers.
 */
import { describe, it, expect } from 'vitest';
import { now, fromISO, formatDate, formatTime, getWeekdays, DEFAULT_TIMEZONE } from '@/lib/time';

describe('time helpers', () => {
  it('defaults to Asia/Dhaka timezone', () => {
    expect(DEFAULT_TIMEZONE).toBe('Asia/Dhaka');
  });

  it('now() returns a DateTime in the default timezone', () => {
    const dt = now();
    expect(dt.zoneName).toBe('Asia/Dhaka');
  });

  it('fromISO() parses into the specified timezone', () => {
    const dt = fromISO('2026-11-21T10:00:00Z', 'Asia/Dhaka');
    expect(dt.zoneName).toBe('Asia/Dhaka');
    // UTC 10:00 → Dhaka is +6, so 16:00
    expect(dt.hour).toBe(16);
  });

  it('formatDate() uses the given locale', () => {
    const dt = fromISO('2026-11-21T10:00:00Z');
    const en = formatDate(dt, 'en', 'EEEE');
    expect(en).toBe('Saturday');
  });

  it('formatTime() supports 12-hour and 24-hour', () => {
    const dt = fromISO('2026-11-21T13:30:00Z', 'Asia/Dhaka');
    const time12 = formatTime(dt, 'en', false);
    const time24 = formatTime(dt, 'en', true);
    expect(time24).toBe('19:30');
    expect(time12).toContain('7:30');
  });

  it('getWeekdays() starts on Saturday by default', () => {
    const days = getWeekdays('en');
    expect(days[0]).toBe('Saturday');
    expect(days.length).toBe(7);
  });
});
