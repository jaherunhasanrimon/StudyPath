/**
 * Pure functions: ISO-8601 YouTube duration parsing and localized duration formatting.
 * Source: docs/architecture.md §6.2.
 */

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Converts Western digits [0-9] in a string or number to Bangla numerals [০-৯].
 */
export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (digit) => BANGLA_DIGITS[Number(digit)]);
}

/**
 * Parses an ISO-8601 duration string (e.g. "PT1H2M30S", "PT15M", "P0D") into seconds.
 * Returns 0 if invalid or 0-duration (such as live streams / premieres).
 */
export function parseIsoDuration(durationStr: string): number {
  if (!durationStr || typeof durationStr !== 'string') {
    return 0;
  }

  // ISO 8601 duration regex matching P#Y#M#DT#H#M#S
  const regex =
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
  const match = durationStr.match(regex);

  if (!match) {
    return 0;
  }

  const days = Number(match[4] || 0);
  const hours = Number(match[5] || 0);
  const minutes = Number(match[6] || 0);
  const seconds = Number(match[7] || 0);

  // Return total seconds
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats a duration in seconds into a human-readable localized string.
 * Examples:
 *   formatDuration(3720, 'en') -> "1 h 2 min"
 *   formatDuration(3720, 'bn') -> "১ ঘণ্টা ২ মিনিট"
 *   formatDuration(45, 'en')   -> "45 sec"
 */
export function formatDuration(totalSeconds: number, locale: 'bn' | 'en' = 'bn'): string {
  if (totalSeconds <= 0) {
    return locale === 'bn' ? '০ মিনিট' : '0 min';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const remainingSeconds = totalSeconds % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  if (hours > 0) {
    if (minutes > 0) {
      if (locale === 'bn') {
        return `${toBanglaDigits(hours)} ঘণ্টা ${toBanglaDigits(minutes)} মিনিট`;
      }
      return `${hours} h ${minutes} min`;
    }
    if (locale === 'bn') {
      return `${toBanglaDigits(hours)} ঘণ্টা`;
    }
    return `${hours} h`;
  }

  if (minutes > 0) {
    if (locale === 'bn') {
      return `${toBanglaDigits(minutes)} মিনিট`;
    }
    return `${minutes} min`;
  }

  // Under 1 minute
  if (locale === 'bn') {
    return `${toBanglaDigits(seconds)} সেকেন্ড`;
  }
  return `${seconds} sec`;
}
