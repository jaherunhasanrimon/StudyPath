/**
 * Pure domain logic for detecting missed schedule items.
 * Governed by docs/architecture.md §7.4 and docs/phases.md §2 (Phase 3).
 */
import { DateTime } from 'luxon';
import { PlanItemRow } from './types';

export interface MissedDetectionResult {
  missedItemIds: string[];
  overdueItems: PlanItemRow[];
}

/**
 * Detects items whose scheduled end time is in the past and status is still 'scheduled'.
 */
export function detectMissedItems(
  items: PlanItemRow[],
  nowIso: string,
  timezone = 'Asia/Dhaka'
): MissedDetectionResult {
  const nowDt = DateTime.fromISO(nowIso, { zone: timezone });
  const missedItemIds: string[] = [];
  const overdueItems: PlanItemRow[] = [];

  for (const item of items) {
    if (item.status === 'scheduled') {
      const endDt = DateTime.fromISO(item.end_at, { zone: timezone });
      if (endDt < nowDt) {
        missedItemIds.push(item.id);
        overdueItems.push({
          ...item,
          status: 'missed',
        });
      }
    } else if (item.status === 'missed') {
      overdueItems.push(item);
    }
  }

  // Sort overdue items in chronological order
  overdueItems.sort((a, b) => a.start_at.localeCompare(b.start_at));

  return {
    missedItemIds,
    overdueItems,
  };
}
