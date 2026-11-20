/**
 * Unit tests for YouTube ISO-8601 duration parser and formatter.
 */
import { describe, it, expect } from 'vitest';
import { parseIsoDuration, formatDuration, toBanglaDigits } from '@/modules/youtube/duration';

describe('parseIsoDuration', () => {
  it('parses standard hours, minutes, seconds (PT1H2M3S)', () => {
    // 1*3600 + 2*60 + 3 = 3600 + 120 + 3 = 3723
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
  });

  it('parses minutes and seconds only (PT14M33S)', () => {
    // 14*60 + 33 = 840 + 33 = 873
    expect(parseIsoDuration('PT14M33S')).toBe(873);
  });

  it('parses seconds only (PT45S)', () => {
    expect(parseIsoDuration('PT45S')).toBe(45);
  });

  it('parses minutes only (PT20M)', () => {
    expect(parseIsoDuration('PT20M')).toBe(1200);
  });

  it('parses hours only (PT2H)', () => {
    expect(parseIsoDuration('PT2H')).toBe(7200);
  });

  it('parses hours and seconds without minutes (PT1H30S)', () => {
    expect(parseIsoDuration('PT1H30S')).toBe(3630);
  });

  it('parses multi-day durations (P1DT2H30M)', () => {
    // 1 day = 86400, 2 hours = 7200, 30 min = 1800 -> 95400
    expect(parseIsoDuration('P1DT2H30M')).toBe(95400);
  });

  it('returns 0 for zero durations / live stream indicator (P0D, PT0S, PT0M0S)', () => {
    expect(parseIsoDuration('P0D')).toBe(0);
    expect(parseIsoDuration('PT0S')).toBe(0);
    expect(parseIsoDuration('PT0M0S')).toBe(0);
  });

  it('returns 0 for empty or invalid inputs', () => {
    expect(parseIsoDuration('')).toBe(0);
    expect(parseIsoDuration('invalid')).toBe(0);
    expect(parseIsoDuration('PT')).toBe(0);
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes in English', () => {
    expect(formatDuration(3660, 'en')).toBe('1 h 1 min');
    expect(formatDuration(36720, 'en')).toBe('10 h 12 min');
  });

  it('formats minutes only in English (< 1 hour)', () => {
    expect(formatDuration(2700, 'en')).toBe('45 min');
    expect(formatDuration(180, 'en')).toBe('3 min');
  });

  it('formats hours and minutes in Bangla', () => {
    expect(formatDuration(3660, 'bn')).toBe('১ ঘণ্টা ১ মিনিট');
    expect(formatDuration(36720, 'bn')).toBe('১০ ঘণ্টা ১২ মিনিট');
  });

  it('formats minutes only in Bangla (< 1 hour)', () => {
    expect(formatDuration(2700, 'bn')).toBe('৪৫ মিনিট');
  });

  it('formats seconds when under 1 minute', () => {
    expect(formatDuration(45, 'en')).toBe('45 sec');
    expect(formatDuration(45, 'bn')).toBe('৪৫ সেকেন্ড');
  });

  it('formats 0 seconds', () => {
    expect(formatDuration(0, 'en')).toBe('0 min');
    expect(formatDuration(0, 'bn')).toBe('০ মিনিট');
  });
});

describe('toBanglaDigits', () => {
  it('converts English digits to Bangla numerals', () => {
    expect(toBanglaDigits('0123456789')).toBe('০১২৩৪৫৬৭৮৯');
    expect(toBanglaDigits(2026)).toBe('২০২৬');
    expect(toBanglaDigits('Class 5')).toBe('Class ৫');
  });
});
