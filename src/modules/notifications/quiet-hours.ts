/**
 * Quiet Hours Enforcement (architecture.md §11 & phases.md §1 Phase 5)
 * Pure Luxon-based time calculations in student timezone (default Asia/Dhaka).
 * Protects sleep by pausing or rescheduling notifications between 22:00 and 07:00.
 */
import { DateTime } from 'luxon';

export interface QuietHourTime {
  hour: number;
  minute: number;
}

export interface QuietHourAdjustment {
  originalIso: string;
  adjustedIso: string;
  wasAdjusted: boolean;
}

/**
 * Parses "HH:mm" time strings, falling back to 22:00 if invalid.
 */
export function parseQuietHourTime(timeStr: string): QuietHourTime {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return { hour: 22, minute: 0 };
  }
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { hour: 22, minute: 0 };
  }
  return { hour, minute };
}

/**
 * Checks if a given UTC ISO timestamp falls within quiet hours in the target timezone.
 * Handles cross-midnight ranges (e.g. 22:00 to 07:00).
 */
export function isQuietHour(
  isoTimestamp: string,
  quietStart = '22:00',
  quietEnd = '07:00',
  timezone = 'Asia/Dhaka'
): boolean {
  const dt = DateTime.fromISO(isoTimestamp, { zone: timezone });
  if (!dt.isValid) return false;

  const start = parseQuietHourTime(quietStart);
  const end = parseQuietHourTime(quietEnd);

  const currentMinutes = dt.hour * 60 + dt.minute;
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  if (startMinutes > endMinutes) {
    // Crosses midnight (e.g., 22:00 (1320m) to 07:00 (420m))
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Same day range (e.g. 01:00 to 06:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

/**
 * Adjusts a quiet-hour timestamp forward to the exact end of quiet hours (e.g. 07:00).
 * If the timestamp is already outside quiet hours, returns it unchanged.
 */
export function adjustForQuietHours(
  isoTimestamp: string,
  quietStart = '22:00',
  quietEnd = '07:00',
  timezone = 'Asia/Dhaka'
): QuietHourAdjustment {
  if (!isQuietHour(isoTimestamp, quietStart, quietEnd, timezone)) {
    return { originalIso: isoTimestamp, adjustedIso: isoTimestamp, wasAdjusted: false };
  }

  const dt = DateTime.fromISO(isoTimestamp, { zone: timezone });
  const end = parseQuietHourTime(quietEnd);

  let adjustedDt = dt.set({
    hour: end.hour,
    minute: end.minute,
    second: 0,
    millisecond: 0,
  });

  // If the original timestamp was late evening (e.g., 22:00-23:59), the 07:00 end is next morning
  const start = parseQuietHourTime(quietStart);
  const currentMinutes = dt.hour * 60 + dt.minute;
  const startMinutes = start.hour * 60 + start.minute;

  if (startMinutes > end.hour * 60 + end.minute && currentMinutes >= startMinutes) {
    adjustedDt = adjustedDt.plus({ days: 1 });
  }

  return {
    originalIso: isoTimestamp,
    adjustedIso: adjustedDt.toUTC().toISO() ?? isoTimestamp,
    wasAdjusted: true,
  };
}
