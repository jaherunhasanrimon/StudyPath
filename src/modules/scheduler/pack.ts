/**
 * src/modules/scheduler/pack.ts
 *
 * Sequential packing algorithm.
 * Governed by docs/architecture.md §7.2 step 5:
 * - Places items from window start with breakMinutes between items.
 * - Enforces maxClassesPerDay and daily minutes caps.
 * - Never skips ahead to fit smaller items (strictly sequential).
 */

import { WorkItem } from './sequence';
import { StudyDay } from './days';
import { Prefs, PlanItem } from './types';
import { timeToMinutes, minutesToTime } from './schema';

export interface PackingOptions {
  dailyMinutesCap?: number; // Optional cap (used by deadline binary search or minutesPerDay)
}

export function packWorkItems(
  workItems: WorkItem[],
  candidateDays: StudyDay[],
  prefs: Prefs,
  options: PackingOptions = {}
): PlanItem[] {
  const { maxClassesPerDay, breakMinutes, buffer } = prefs;
  const planItems: PlanItem[] = [];

  let itemIdx = 0;
  let dayIdx = 0;
  let seq = 1;

  // Global daily minute limit from pacing or options
  let activeDailyMinuteLimit = Infinity;
  if (options.dailyMinutesCap !== undefined) {
    activeDailyMinuteLimit = options.dailyMinutesCap;
  } else if (prefs.pacing.mode === 'minutesPerDay') {
    activeDailyMinuteLimit = prefs.pacing.value;
  }

  // Ratio buffer scaling
  const ratioScale = buffer.mode === 'ratio' ? 1 - buffer.value : 1.0;

  while (itemIdx < workItems.length && dayIdx < candidateDays.length) {
    const day = candidateDays[dayIdx];

    // If day is a buffer catch-up day, skip it for primary classes
    if (day.isBufferDay) {
      dayIdx++;
      continue;
    }

    let dailyClassesCount = 0;
    let dailyMinutesUsed = 0;

    // Iterate over available windows for this day
    for (const w of day.windows) {
      if (itemIdx >= workItems.length) break;

      const windowStartMin = timeToMinutes(w.start);
      const originalWindowEndMin = timeToMinutes(w.end);
      const rawWindowSpan = originalWindowEndMin - windowStartMin;

      // Apply ratio buffer scaling to window duration
      const effectiveWindowSpan = Math.floor(rawWindowSpan * ratioScale);
      const windowEndMin = windowStartMin + effectiveWindowSpan;

      let currentTimeMin = windowStartMin;
      let isFirstItemInWindow = true;

      while (itemIdx < workItems.length) {
        const item = workItems[itemIdx];

        // 1. Check maxClassesPerDay limit (only applies to 'class' items)
        if (item.type === 'class' && dailyClassesCount >= maxClassesPerDay) {
          // Cannot add more classes today; break to next day
          break;
        }

        // 2. Check if daily minutes cap would be exceeded
        if (dailyMinutesUsed + item.durationMin > activeDailyMinuteLimit) {
          // Cannot add more items today due to daily cap; break to next day
          break;
        }

        // 3. Check time window fit with breakMinutes
        const breakNeeded = isFirstItemInWindow ? 0 : breakMinutes;
        const proposedStartMin = currentTimeMin + breakNeeded;
        const proposedEndMin = proposedStartMin + item.durationMin;

        if (proposedEndMin > windowEndMin) {
          // Does not fit in this window
          break;
        }

        // Item fits! Place it.
        planItems.push({
          id: item.id,
          seq: seq++,
          type: item.type,
          date: day.date,
          start: minutesToTime(proposedStartMin),
          end: minutesToTime(proposedEndMin),
          durationMin: item.durationMin,
          videoIds: item.videoIds,
          part: item.part,
          covers: item.covers,
          label: item.label,
        });

        if (item.type === 'class') {
          dailyClassesCount++;
        }
        dailyMinutesUsed += item.durationMin;
        currentTimeMin = proposedEndMin;
        isFirstItemInWindow = false;
        itemIdx++;
      }
    }

    dayIdx++;
  }

  return planItems;
}
