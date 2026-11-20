/**
 * Luxon date/time helpers.
 * Default timezone: Asia/Dhaka (architecture.md §2.3).
 * Dates stored in UTC, displayed in local time.
 */
import { DateTime, Settings, Info } from 'luxon';

/** Default timezone for the app */
export const DEFAULT_TIMEZONE = 'Asia/Dhaka';

/** Ensure Luxon uses our default zone */
Settings.defaultZone = DEFAULT_TIMEZONE;

/**
 * Get the current time in the given timezone.
 */
export function now(timezone: string = DEFAULT_TIMEZONE): DateTime {
  return DateTime.now().setZone(timezone);
}

/**
 * Parse an ISO date string into a DateTime in the given timezone.
 */
export function fromISO(
  iso: string,
  timezone: string = DEFAULT_TIMEZONE
): DateTime {
  return DateTime.fromISO(iso, { zone: timezone });
}

/**
 * Format a date for display. Uses Bangla or English based on locale.
 */
export function formatDate(
  dt: DateTime,
  locale: string = 'bn',
  format: string = 'EEEE, d MMMM yyyy'
): string {
  return dt.setLocale(locale).toFormat(format);
}

/**
 * Format a time for display (12-hour by default).
 */
export function formatTime(
  dt: DateTime,
  locale: string = 'bn',
  use24Hour: boolean = false
): string {
  const format = use24Hour ? 'HH:mm' : 'h:mm a';
  return dt.setLocale(locale).toFormat(format);
}

/**
 * Get weekday names in the given locale.
 * Week starts on Saturday by default (design.md §10).
 */
export function getWeekdays(
  locale: string = 'bn',
  startDay: number = 6 // 6 = Saturday in Luxon (1=Mon...7=Sun)
): string[] {
  const days = Info.weekdays('long', { locale });
  // Rotate so startDay is first
  const offset = startDay - 1;
  return [...days.slice(offset), ...days.slice(0, offset)];
}
