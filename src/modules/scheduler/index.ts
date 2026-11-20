/**
 * src/modules/scheduler/index.ts
 *
 * Core Pure Deterministic Scheduling Engine.
 * Governed by docs/architecture.md §7.1 - §7.7:
 * - Pure: No network, no DB, no React/Next.js, no clock.
 * - Deterministic: Same inputs produce identical output and identical inputHash.
 */

import { Video, Prefs, PlanResult, PlanItem, PlanSummary } from './types';
import { normalizeVideos } from './normalize';
import { groupVideosIntoClasses } from './group';
import { buildWorkSequence } from './sequence';
import { getStudyDays, getMaxWindowDurationMinutes } from './days';
import { packWorkItems } from './pack';
import { optimizeForDeadline } from './deadline';
import { scheduleSpacedReviews } from './review';
import { scheduleWeeklyTests } from './weekly-test';
import { evaluateFeasibility } from './feasibility';
import { computeInputHash } from './hash';

export const ENGINE_VERSION = '1.0.0';

export function buildPlan(
  videos: Video[],
  prefs: Prefs,
  options?: { skipSuggestions?: boolean }
): PlanResult {
  // 1. Normalise input videos (effective duration, drop unavailable)
  const { videos: normalized, warnings: normWarnings } = normalizeVideos(
    videos,
    prefs.playbackSpeed,
    prefs.studyFactor
  );

  const maxWindowMinutes = getMaxWindowDurationMinutes(prefs.availability);

  // 2. Group into classes (one-per-class vs auto-group & splitting)
  const classes = groupVideosIntoClasses(normalized, prefs, maxWindowMinutes);

  // 3. Build work sequence (classes, quizzes, assignments)
  const workItems = buildWorkSequence(classes, prefs);

  // 4. Generate candidate study days
  const candidateDays = getStudyDays(prefs, 365);

  // 5. Pack work items sequentially (or optimize for deadline)
  let planItems: PlanItem[] = [];
  let isImpossibleByDeadline = false;

  if (prefs.pacing.mode === 'deadline') {
    const deadlineResult = optimizeForDeadline(
      workItems,
      candidateDays,
      prefs,
      prefs.pacing.deadline
    );
    planItems = deadlineResult.items;
    if (!deadlineResult.fits) {
      isImpossibleByDeadline = true;
    }
  } else {
    planItems = packWorkItems(workItems, candidateDays, prefs);
  }

  // 6. Optional: Spaced Reviews
  if (prefs.review.enabled) {
    planItems = scheduleSpacedReviews(planItems, candidateDays, prefs);
  }

  // 7. Optional: Weekly Tests
  if (prefs.weeklyTest.enabled) {
    planItems = scheduleWeeklyTests(planItems, candidateDays, prefs);
  }

  // 8. Compute Plan Summary
  const classItems = planItems.filter((i) => i.type === 'class');
  const distinctDays = new Set(planItems.map((i) => i.date));
  const plannedMinutes = planItems.reduce((acc, i) => acc + i.durationMin, 0);
  const videoMinutes = classItems.reduce((acc, i) => acc + i.durationMin, 0);

  const firstDate = planItems.length > 0 ? planItems[0].date : prefs.startDate;
  const lastDate = planItems.length > 0 ? planItems[planItems.length - 1].date : prefs.startDate;
  const studyDaysCount = distinctDays.size;
  const avgMinutesPerStudyDay =
    studyDaysCount > 0 ? Math.round(plannedMinutes / studyDaysCount) : 0;

  const summary: PlanSummary = {
    classes: classes.length,
    videoMinutes,
    plannedMinutes,
    firstDate,
    lastDate,
    studyDays: studyDaysCount,
    avgMinutesPerStudyDay,
  };

  // 9. Evaluate Feasibility and Suggestions
  const feasibility = evaluateFeasibility(
    {
      items: planItems,
      candidateDays,
      prefs,
      videos,
      isImpossibleByDeadline,
    },
    options?.skipSuggestions
      ? undefined
      : (recomputedVideos, recomputedPrefs) => {
          const res = buildPlan(recomputedVideos, recomputedPrefs, { skipSuggestions: true });
          return { lastDate: res.summary.lastDate };
        }
  );

  // 10. Generate Deterministic Input Hash
  const inputHash = computeInputHash({ videos, prefs });

  return {
    items: planItems,
    summary,
    feasibility,
    warnings: normWarnings,
    engineVersion: ENGINE_VERSION,
    inputHash,
  };
}

export { replan } from './replan';
export { toIcs } from './ics';
export { explainPlan } from './explain';
export * from './types';
export * from './schema';
