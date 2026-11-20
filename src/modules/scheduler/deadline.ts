/**
 * src/modules/scheduler/deadline.ts
 *
 * Binary search for deadline pacing mode.
 * Governed by docs/architecture.md §7.2 step 6:
 * - Binary searches the smallest daily cap (minutes) that still finishes by the deadline.
 * - Spreads work evenly across available days instead of front-loading.
 */

import { WorkItem } from './sequence';
import { StudyDay } from './days';
import { Prefs, PlanItem } from './types';
import { packWorkItems } from './pack';

export interface DeadlineOptimizationResult {
  fits: boolean;
  optimalCap?: number;
  items: PlanItem[];
}

export function optimizeForDeadline(
  workItems: WorkItem[],
  candidateDays: StudyDay[],
  prefs: Prefs,
  deadlineIso: string
): DeadlineOptimizationResult {
  // 1. Pack with full availability (no cap) to see if deadline is feasible at all
  const fullCapacityItems = packWorkItems(workItems, candidateDays, prefs);

  if (fullCapacityItems.length < workItems.length) {
    // Could not even fit all items in candidate days
    return {
      fits: false,
      items: fullCapacityItems,
    };
  }

  const lastDate = fullCapacityItems[fullCapacityItems.length - 1]?.date;
  if (!lastDate || lastDate > deadlineIso) {
    // Unachievable by deadline with full availability
    return {
      fits: false,
      items: fullCapacityItems,
    };
  }

  // 2. Binary search the smallest daily cap in minutes that still meets the deadline
  let low = 15;
  let high = 1440; // Max minutes in a day
  let bestCap = high;
  let bestItems = fullCapacityItems;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidateItems = packWorkItems(workItems, candidateDays, prefs, {
      dailyMinutesCap: mid,
    });

    const meetsDeadline =
      candidateItems.length === workItems.length &&
      candidateItems[candidateItems.length - 1].date <= deadlineIso;

    if (meetsDeadline) {
      bestCap = mid;
      bestItems = candidateItems;
      high = mid - 1; // Try to find an even smaller cap to spread more evenly
    } else {
      low = mid + 1; // Need a higher cap to finish in time
    }
  }

  return {
    fits: true,
    optimalCap: bestCap,
    items: bestItems,
  };
}
