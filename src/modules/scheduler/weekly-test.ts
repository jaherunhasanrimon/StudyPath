/**
 * src/modules/scheduler/weekly-test.ts
 *
 * Weekly test generator.
 * Governed by docs/architecture.md §7.2 step 9:
 * - On weeklyTest.weekday, adds a test covering classes from the previous 7 days.
 */

import { DateTime } from 'luxon';
import { PlanItem, Prefs } from './types';
import { StudyDay } from './days';
import { timeToMinutes, minutesToTime } from './schema';

const WEEKDAY_NUM_MAP: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

export function scheduleWeeklyTests(
  items: PlanItem[],
  candidateDays: StudyDay[],
  prefs: Prefs
): PlanItem[] {
  if (!prefs.weeklyTest.enabled) {
    return items;
  }

  const { weekday, minutes } = prefs.weeklyTest;
  const targetWeekdayNum = WEEKDAY_NUM_MAP[weekday];
  const { timezone, breakMinutes } = prefs;

  const result = [...items];
  const itemsByDate = new Map<string, PlanItem[]>();
  for (const it of items) {
    if (!itemsByDate.has(it.date)) {
      itemsByDate.set(it.date, []);
    }
    itemsByDate.get(it.date)!.push(it);
  }

  // Iterate over study days that match weeklyTest.weekday
  for (const day of candidateDays) {
    const dt = DateTime.fromISO(day.date, { zone: timezone });
    if (dt.weekday === targetWeekdayNum) {
      // Find classes from previous 7 days
      const weekStartIso = dt.minus({ days: 7 }).toISODate()!;
      const coveredClasses = items.filter(
        (it) => it.type === 'class' && it.date >= weekStartIso && it.date <= day.date
      );

      if (coveredClasses.length > 0) {
        const dayItems = itemsByDate.get(day.date) || [];
        const lastItem = dayItems[dayItems.length - 1];
        let startMin = timeToMinutes(day.windows[0]?.start || '19:30');

        if (lastItem) {
          startMin = timeToMinutes(lastItem.end) + breakMinutes;
        }

        const endMin = startMin + minutes;

        result.push({
          id: `weekly-test-${day.date}`,
          seq: 0,
          type: 'weekly_test',
          date: day.date,
          start: minutesToTime(startMin),
          end: minutesToTime(endMin),
          durationMin: minutes,
          label: `Weekly Test (${coveredClasses.length} classes covered)`,
        });
      }
    }
  }

  // Re-sort and renumber
  result.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.start.localeCompare(b.start);
  });

  let seq = 1;
  result.forEach((it) => {
    it.seq = seq++;
  });

  return result;
}
