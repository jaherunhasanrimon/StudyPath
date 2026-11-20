/**
 * src/modules/scheduler/days.ts
 *
 * Calendar day generator and availability evaluator.
 * Pure date calculations using Luxon with specified timezone.
 *
 * Governed by docs/architecture.md §7.2 step 4:
 * - Iterates calendar days from startDate in plan timezone.
 * - Filters blackout dates.
 * - Handles 'classesPerWeek' (picks k days with largest minimum gap).
 * - Handles 'weekly-day' buffer (reserves last study day of each week).
 */

import { DateTime } from 'luxon';
import { Availability, Weekday, Window, Prefs } from './types';
import { timeToMinutes } from './schema';

export interface StudyDay {
  date: string; // 'YYYY-MM-DD'
  weekday: Weekday;
  windows: Window[];
  totalWindowMinutes: number;
  isBufferDay: boolean;
}

const WEEKDAY_MAP: Record<number, Weekday> = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
  7: 'sun',
};

/**
 * Calculates total available minutes from a list of windows.
 */
export function getWindowsCapacityMinutes(windows: Window[]): number {
  return windows.reduce((total, w) => {
    return total + (timeToMinutes(w.end) - timeToMinutes(w.start));
  }, 0);
}

/**
 * Finds the max window duration across all weekdays.
 */
export function getMaxWindowDurationMinutes(availability: Availability): number {
  let max = 0;
  for (const day of Object.keys(availability) as Weekday[]) {
    for (const w of availability[day]) {
      const duration = timeToMinutes(w.end) - timeToMinutes(w.start);
      if (duration > max) {
        max = duration;
      }
    }
  }
  return max > 0 ? max : 120; // Fallback to 120m if no windows defined
}

/**
 * For classesPerWeek = k, selects k weekdays from available weekdays
 * that maximize the minimum gap between chosen days.
 */
function selectBestWeekdays(availableDays: Weekday[], k: number): Set<Weekday> {
  if (availableDays.length <= k) {
    return new Set(availableDays);
  }

  // Weekday indices: mon=1 ... sun=7
  const dayIndices: Record<Weekday, number> = {
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
    sun: 7,
  };

  const sorted = [...availableDays].sort((a, b) => dayIndices[a] - dayIndices[b]);

  // Generate all combinations of size k
  function combinations<T>(arr: T[], size: number): T[][] {
    if (size === 0) return [[]];
    if (arr.length === 0) return [];
    const [head, ...tail] = arr;
    const withHead = combinations(tail, size - 1).map((c) => [head, ...c]);
    const withoutHead = combinations(tail, size);
    return [...withHead, ...withoutHead];
  }

  const allCombos = combinations(sorted, k);
  let bestCombo = allCombos[0];
  let maxMinGap = -1;

  for (const combo of allCombos) {
    const indices = combo.map((d) => dayIndices[d]);
    let minGap = 7;
    for (let i = 0; i < indices.length; i++) {
      const nextIdx = (i + 1) % indices.length;
      const gap = (indices[nextIdx] - indices[i] + 7) % 7 || 7;
      if (gap < minGap) minGap = gap;
    }
    if (minGap > maxMinGap) {
      maxMinGap = minGap;
      bestCombo = combo;
    }
  }

  return new Set(bestCombo);
}

/**
 * Creates a generator or iterator of candidate study days starting from startDate.
 */
export function getStudyDays(prefs: Prefs, maxDaysToGenerate = 365): StudyDay[] {
  const { timezone, startDate, availability, blackoutDates, pacing, buffer } = prefs;
  const blackoutSet = new Set(blackoutDates);

  // Available weekdays that have at least one window
  const activeWeekdays = (Object.keys(availability) as Weekday[]).filter(
    (d) => availability[d].length > 0
  );

  let allowedWeekdaysSet: Set<Weekday> | null = null;
  if (pacing.mode === 'classesPerWeek') {
    allowedWeekdaysSet = selectBestWeekdays(activeWeekdays, pacing.value);
  }

  let dt = DateTime.fromISO(startDate, { zone: timezone });
  if (!dt.isValid) {
    throw new Error(`Invalid startDate: ${startDate}`);
  }

  const days: StudyDay[] = [];
  let dayCount = 0;

  // We group by week to apply weekly-day buffer if needed
  while (dayCount < maxDaysToGenerate) {
    const isoDate = dt.toISODate()!;
    const weekdayKey = WEEKDAY_MAP[dt.weekday];

    const isBlackout = blackoutSet.has(isoDate);
    const hasWindows = availability[weekdayKey].length > 0;
    const isAllowedByPacing = !allowedWeekdaysSet || allowedWeekdaysSet.has(weekdayKey);

    if (!isBlackout && hasWindows && isAllowedByPacing) {
      const windows = availability[weekdayKey];
      const totalWindowMinutes = getWindowsCapacityMinutes(windows);

      days.push({
        date: isoDate,
        weekday: weekdayKey,
        windows,
        totalWindowMinutes,
        isBufferDay: false, // We'll mark weekly buffer below
      });
    }

    dt = dt.plus({ days: 1 });
    dayCount++;
  }

  // Handle 'weekly-day' buffer mode:
  // "reserve the last study day of each week as catch-up with no new items"
  if (buffer.mode === 'weekly-day' && days.length > 0) {
    // Group days by ISO week (or 7-day intervals from startDate)
    const weekMap = new Map<string, StudyDay[]>();
    for (const d of days) {
      const luxonDay = DateTime.fromISO(d.date, { zone: timezone });
      const weekKey = `${luxonDay.weekYear}-W${luxonDay.weekNumber}`;
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(d);
    }

    for (const weekDays of weekMap.values()) {
      if (weekDays.length > 1) {
        // Reserve the last study day of this week
        const lastDay = weekDays[weekDays.length - 1];
        lastDay.isBufferDay = true;
      }
    }
  }

  return days;
}
