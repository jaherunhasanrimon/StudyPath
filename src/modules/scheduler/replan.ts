/**
 * src/modules/scheduler/replan.ts
 *
 * Re-planning engine.
 * Governed by docs/architecture.md §7.4:
 * - Completed items are immutable.
 * - Items with end < now and scheduled status become missed.
 * - 'shift': re-pack remaining items starting from today.
 * - 'compress': keep original finish date if possible.
 * - 'balanced': allow finish date to move by at most 25%.
 * - Never schedules in the past.
 */

import { DateTime } from 'luxon';
import { PlanResult, Progress, ReplanStrategy, ReplanResult, Video, Prefs, PlanItem } from './types';
import { buildPlan } from './index';

export function replan(
  plan: PlanResult,
  progress: Progress,
  nowIso: string,
  strategy: ReplanStrategy,
  videos: Video[],
  prefs: Prefs
): ReplanResult {
  const completedSet = new Set(progress.completedItemIds);
  const nowDt = DateTime.fromISO(nowIso, { zone: prefs.timezone });
  const nowDateIso = nowDt.toISODate()!;

  // 1. Separate completed vs remaining items
  const completedItems = plan.items.filter((it) => completedSet.has(it.id));
  const remainingItems = plan.items.filter((it) => !completedSet.has(it.id));

  // Determine remaining uncompleted videos
  const completedVideoIds = new Set<string>();
  for (const it of completedItems) {
    if (it.videoIds) {
      it.videoIds.forEach((vid) => completedVideoIds.add(vid));
    }
  }

  const remainingVideos = videos.filter((v) => !completedVideoIds.has(v.id));

  // If no remaining videos, return existing plan with empty diff
  if (remainingVideos.length === 0) {
    return {
      plan,
      diff: { moved: [], added: [], removed: [] },
    };
  }

  // 2. Adjust prefs for replanning starting from nowDateIso
  const adjustedPrefs: Prefs = {
    ...prefs,
    startDate: nowDateIso > prefs.startDate ? nowDateIso : prefs.startDate,
  };

  if (strategy === 'compress') {
    // Keep original finish date as deadline
    adjustedPrefs.pacing = {
      mode: 'deadline',
      deadline: plan.summary.lastDate,
    };
  } else if (strategy === 'balanced') {
    // Allow up to 25% extension
    const originalLastDt = DateTime.fromISO(plan.summary.lastDate, { zone: prefs.timezone });
    const daysRemaining = originalLastDt.diff(nowDt, 'days').days;
    const extension = Math.max(1, Math.ceil(daysRemaining * 0.25));
    const balancedDeadline = originalLastDt.plus({ days: extension }).toISODate()!;
    adjustedPrefs.pacing = {
      mode: 'deadline',
      deadline: balancedDeadline,
    };
  }

  // 3. Rebuild plan for remaining videos
  const newSubPlan = buildPlan(remainingVideos, adjustedPrefs);

  // Combine completed items and newly scheduled items
  let seq = 1;
  const mergedItems: PlanItem[] = [];

  for (const comp of completedItems) {
    mergedItems.push({
      ...comp,
      seq: seq++,
    });
  }

  for (const newItem of newSubPlan.items) {
    mergedItems.push({
      ...newItem,
      seq: seq++,
    });
  }

  // Calculate moved items diff
  const oldRemainingMap = new Map(remainingItems.map((it) => [it.id, it]));
  const moved: ReplanResult['diff']['moved'] = [];

  for (const newItem of newSubPlan.items) {
    const old = oldRemainingMap.get(newItem.id);
    if (old && (old.date !== newItem.date || old.start !== newItem.start)) {
      moved.push({
        itemId: newItem.id,
        oldDate: old.date,
        newDate: newItem.date,
        oldStart: old.start,
        newStart: newItem.start,
      });
    }
  }

  const finalPlan: PlanResult = {
    items: mergedItems,
    summary: {
      classes: mergedItems.filter((i) => i.type === 'class').length,
      videoMinutes: mergedItems
        .filter((i) => i.type === 'class')
        .reduce((sum, i) => sum + i.durationMin, 0),
      plannedMinutes: mergedItems.reduce((sum, i) => sum + i.durationMin, 0),
      firstDate: mergedItems[0]?.date || nowDateIso,
      lastDate: mergedItems[mergedItems.length - 1]?.date || nowDateIso,
      studyDays: new Set(mergedItems.map((i) => i.date)).size,
      avgMinutesPerStudyDay: Math.round(
        mergedItems.reduce((sum, i) => sum + i.durationMin, 0) /
          Math.max(1, new Set(mergedItems.map((i) => i.date)).size)
      ),
    },
    feasibility: newSubPlan.feasibility,
    warnings: newSubPlan.warnings,
    engineVersion: newSubPlan.engineVersion,
    inputHash: newSubPlan.inputHash,
  };

  return {
    plan: finalPlan,
    diff: {
      moved,
      added: [],
      removed: [],
    },
  };
}
