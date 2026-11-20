/**
 * src/modules/scheduler/feasibility.ts
 *
 * Feasibility evaluation and suggestions generator.
 * Governed by docs/architecture.md §7.3:
 * - 'ok': finishes by deadline and busiest day <= 85% window capacity.
 * - 'tight': finishes in last 10% of allowed time, or any day > 85% capacity.
 * - 'impossible': cannot finish by deadline with given availability.
 * - Returns up to 3 concrete suggestions with computed effects.
 */

import { DateTime } from 'luxon';
import { PlanItem, Prefs, FeasibilityResult, Suggestion, Video } from './types';
import { StudyDay, getWindowsCapacityMinutes } from './days';
import { timeToMinutes } from './schema';

export interface FeasibilityInput {
  items: PlanItem[];
  candidateDays: StudyDay[];
  prefs: Prefs;
  videos: Video[];
  isImpossibleByDeadline?: boolean;
}

export function evaluateFeasibility(
  input: FeasibilityInput,
  recomputeWithPrefs?: (videos: Video[], prefs: Prefs) => { lastDate: string }
): FeasibilityResult {
  const { items, candidateDays, prefs, isImpossibleByDeadline } = input;
  const reasons: string[] = [];
  const suggestions: Suggestion[] = [];

  if (items.length === 0) {
    return {
      status: 'ok',
      reasons: [],
      suggestions: [],
    };
  }

  // Map of date -> total planned minutes
  const dailyPlannedMinutes = new Map<string, number>();
  for (const it of items) {
    dailyPlannedMinutes.set(
      it.date,
      (dailyPlannedMinutes.get(it.date) || 0) + it.durationMin
    );
  }

  // Calculate capacity utilization on study days
  let maxUtilization = 0;
  let busiestDate = '';

  for (const day of candidateDays) {
    const planned = dailyPlannedMinutes.get(day.date) || 0;
    if (planned > 0) {
      const windowCap = getWindowsCapacityMinutes(day.windows);
      const util = windowCap > 0 ? planned / windowCap : 1;
      if (util > maxUtilization) {
        maxUtilization = util;
        busiestDate = day.date;
      }
    }
  }

  const lastDate = items[items.length - 1].date;

  // 1. Check Deadline Feasibility
  let isDeadlineExceeded = false;
  let deadlineTight = false;

  if (prefs.pacing.mode === 'deadline') {
    const deadline = prefs.pacing.deadline;
    if (isImpossibleByDeadline || lastDate > deadline) {
      isDeadlineExceeded = true;
      reasons.push(`Cannot finish by deadline ${deadline} with your current availability.`);
    } else {
      // Check if finished in last 10% of time allowed
      const startDt = DateTime.fromISO(prefs.startDate);
      const endDt = DateTime.fromISO(deadline);
      const lastDt = DateTime.fromISO(lastDate);

      const totalSpanDays = endDt.diff(startDt, 'days').days;
      const daysLeft = endDt.diff(lastDt, 'days').days;

      if (totalSpanDays > 0 && daysLeft / totalSpanDays <= 0.1) {
        deadlineTight = true;
        reasons.push('Finishes very close to your deadline with minimal buffer.');
      }
    }
  }

  // 2. Check Daily Load Utilization
  const isHighLoad = maxUtilization > 0.85;
  if (isHighLoad) {
    reasons.push(
      `Busiest study day (${busiestDate}) uses ${(maxUtilization * 100).toFixed(0)}% of your available study window.`
    );
  }

  // Determine Overall Status
  let status: 'ok' | 'tight' | 'impossible' = 'ok';
  if (isDeadlineExceeded) {
    status = 'impossible';
  } else if (deadlineTight || isHighLoad) {
    status = 'tight';
  }

  // 3. Generate Suggestions for 'tight' or 'impossible'
  if (status !== 'ok') {
    // Suggestion 1: Increase playback speed
    if (prefs.playbackSpeed < 1.5) {
      const newSpeed = prefs.playbackSpeed === 1 ? 1.25 : 1.5;
      const modifiedPrefs: Prefs = {
        ...prefs,
        playbackSpeed: newSpeed as 1 | 1.25 | 1.5,
      };
      let computedFinish = '';
      if (recomputeWithPrefs) {
        try {
          computedFinish = recomputeWithPrefs(input.videos, modifiedPrefs).lastDate;
        } catch {
          // ignore
        }
      }
      suggestions.push({
        type: 'speed',
        labelKey: 'suggestion.speed',
        params: { speed: `${newSpeed}x`, finishDate: computedFinish },
        appliedPrefs: modifiedPrefs,
        computedFinishDate: computedFinish,
      });
    }

    // Suggestion 2: Lengthen windows by 30 minutes
    const longerWindowsAvailability = { ...prefs.availability };
    for (const d of Object.keys(longerWindowsAvailability) as (keyof typeof longerWindowsAvailability)[]) {
      longerWindowsAvailability[d] = longerWindowsAvailability[d].map((w) => {
        const endMin = timeToMinutes(w.end) + 30;
        const h = Math.min(23, Math.floor(endMin / 60));
        const m = endMin % 60;
        return {
          start: w.start,
          end: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        };
      });
    }
    const modifiedWindowPrefs: Prefs = {
      ...prefs,
      availability: longerWindowsAvailability,
    };
    let computedWindowFinish = '';
    if (recomputeWithPrefs) {
      try {
        computedWindowFinish = recomputeWithPrefs(input.videos, modifiedWindowPrefs).lastDate;
      } catch {
        // ignore
      }
    }
    suggestions.push({
      type: 'longer_windows',
      labelKey: 'suggestion.longerWindows',
      params: { finishDate: computedWindowFinish },
      appliedPrefs: modifiedWindowPrefs,
      computedFinishDate: computedWindowFinish,
    });

    // Suggestion 3: Set new deadline equal to computed finish date
    if (prefs.pacing.mode === 'deadline') {
      const modifiedDeadlinePrefs: Prefs = {
        ...prefs,
        pacing: { mode: 'deadline', deadline: lastDate },
      };
      suggestions.push({
        type: 'new_deadline',
        labelKey: 'suggestion.newDeadline',
        params: { newDeadline: lastDate },
        appliedPrefs: modifiedDeadlinePrefs,
        computedFinishDate: lastDate,
      });
    }
  }

  return {
    status,
    reasons,
    suggestions: suggestions.slice(0, 3), // At most 3 suggestions
  };
}
