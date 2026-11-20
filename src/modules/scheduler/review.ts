/**
 * src/modules/scheduler/review.ts
 *
 * Spaced review generator.
 * Governed by docs/architecture.md §7.2 step 8:
 * - Creates floating review micro-sets at offsets [1, 3, 7, 21] days from class date.
 * - Snaps to the next study day.
 * - Merges reviews due on the same day into min(microMinutes * count, maxDailyMinutes).
 * - Places after primary items if capacity remains.
 */

import { DateTime } from 'luxon';
import { PlanItem, Prefs } from './types';
import { StudyDay } from './days';
import { timeToMinutes, minutesToTime } from './schema';

export function scheduleSpacedReviews(
  items: PlanItem[],
  candidateDays: StudyDay[],
  prefs: Prefs
): PlanItem[] {
  if (!prefs.review.enabled) {
    return items;
  }

  const { offsetsDays, microMinutes, maxDailyMinutes } = prefs.review;
  const { timezone, breakMinutes } = prefs;

  // Build map of study day dates to their StudyDay object
  const studyDayDates = new Set(candidateDays.map((d) => d.date));
  const sortedStudyDayDates = candidateDays.map((d) => d.date).sort();

  // Find next study day on or after a given date
  function getNextStudyDay(dateIso: string): string | null {
    if (studyDayDates.has(dateIso)) return dateIso;
    for (const d of sortedStudyDayDates) {
      if (d > dateIso) return d;
    }
    return null;
  }

  // Find all classes in plan items
  const classItems = items.filter((it) => it.type === 'class');
  const reviewCountsByDate = new Map<string, number>();

  for (const cls of classItems) {
    const classDt = DateTime.fromISO(cls.date, { zone: timezone });
    for (const offset of offsetsDays) {
      const targetDt = classDt.plus({ days: offset });
      const targetIso = targetDt.toISODate()!;
      const snappedDate = getNextStudyDay(targetIso);
      if (snappedDate) {
        reviewCountsByDate.set(
          snappedDate,
          (reviewCountsByDate.get(snappedDate) || 0) + 1
        );
      }
    }
  }

  // Create review items and insert them into the plan
  const result: PlanItem[] = [];
  // Group existing items by date
  const itemsByDate = new Map<string, PlanItem[]>();
  for (const it of items) {
    if (!itemsByDate.has(it.date)) {
      itemsByDate.set(it.date, []);
    }
    itemsByDate.get(it.date)!.push(it);
  }

  // Merge candidate day dates and review dates
  const allDates = Array.from(
    new Set([...itemsByDate.keys(), ...reviewCountsByDate.keys()])
  ).sort();

  let seq = 1;

  for (const date of allDates) {
    const dayItems = itemsByDate.get(date) || [];
    result.push(...dayItems);

    const reviewCount = reviewCountsByDate.get(date) || 0;
    if (reviewCount > 0) {
      const reviewDuration = Math.min(reviewCount * microMinutes, maxDailyMinutes);
      const studyDay = candidateDays.find((d) => d.date === date);

      if (studyDay && studyDay.windows.length > 0) {
        const lastItem = dayItems[dayItems.length - 1];
        let startMin = timeToMinutes(studyDay.windows[0].start);

        if (lastItem) {
          startMin = timeToMinutes(lastItem.end) + breakMinutes;
        }

        const endMin = startMin + reviewDuration;
        const windowEnd = timeToMinutes(studyDay.windows[studyDay.windows.length - 1].end);

        // Only place if it fits inside window or within reasonable leeway
        if (endMin <= windowEnd + 15) {
          result.push({
            id: `review-${date}`,
            seq: 0, // Will renumber seq below
            type: 'review',
            date,
            start: minutesToTime(startMin),
            end: minutesToTime(endMin),
            durationMin: reviewDuration,
            label: `Spaced Review (${reviewCount} topic${reviewCount > 1 ? 's' : ''})`,
          });
        }
      }
    }
  }

  // Renumber sequence numbers
  result.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.start.localeCompare(b.start);
  });

  result.forEach((it) => {
    it.seq = seq++;
  });

  return result;
}
