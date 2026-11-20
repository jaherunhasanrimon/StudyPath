import { describe, it, expect } from 'vitest';
import { detectMissedItems } from '@/modules/plans/missed';
import { PlanItemRow } from '@/modules/plans/types';

describe('Missed Items Detection Engine', () => {
  const baseItem: PlanItemRow = {
    id: 'item-1',
    plan_id: 'plan-1',
    seq: 1,
    type: 'class',
    start_at: '2026-11-20T19:30:00.000Z',
    end_at: '2026-11-20T20:30:00.000Z',
    duration_min: 60,
    video_ids: ['vid-1'],
    part: null,
    covers: [],
    due_at: null,
    label: 'Class 01',
    status: 'scheduled',
    completed_at: null,
    meta: {},
    created_at: '2026-11-20T12:00:00.000Z',
  };

  it('marks scheduled items in the past as missed', () => {
    const items: PlanItemRow[] = [
      {
        ...baseItem,
        id: 'past-item',
        start_at: '2026-11-20T13:30:00.000Z',
        end_at: '2026-11-20T14:30:00.000Z',
        status: 'scheduled',
      },
      {
        ...baseItem,
        id: 'future-item',
        start_at: '2026-11-20T19:30:00.000Z',
        end_at: '2026-11-20T20:30:00.000Z',
        status: 'scheduled',
      },
    ];

    const result = detectMissedItems(items, '2026-11-20T15:00:00.000Z');
    expect(result.missedItemIds).toEqual(['past-item']);
    expect(result.overdueItems).toHaveLength(1);
    expect(result.overdueItems[0].id).toBe('past-item');
    expect(result.overdueItems[0].status).toBe('missed');
  });

  it('does NOT mark completed or skipped items in the past as missed', () => {
    const items: PlanItemRow[] = [
      {
        ...baseItem,
        id: 'done-item',
        start_at: '2026-11-20T13:30:00.000Z',
        end_at: '2026-11-20T14:30:00.000Z',
        status: 'done',
        completed_at: '2026-11-20T14:20:00.000Z',
      },
      {
        ...baseItem,
        id: 'skipped-item',
        start_at: '2026-11-20T13:30:00.000Z',
        end_at: '2026-11-20T14:30:00.000Z',
        status: 'skipped',
      },
    ];

    const result = detectMissedItems(items, '2026-11-20T15:00:00.000Z');
    expect(result.missedItemIds).toEqual([]);
    expect(result.overdueItems).toEqual([]);
  });

  it('preserves already-flagged missed items in overdue list', () => {
    const items: PlanItemRow[] = [
      {
        ...baseItem,
        id: 'already-missed',
        start_at: '2026-11-19T13:30:00.000Z',
        end_at: '2026-11-19T14:30:00.000Z',
        status: 'missed',
      },
    ];

    const result = detectMissedItems(items, '2026-11-20T15:00:00.000Z');
    // already missed, so no new items need status update in DB
    expect(result.missedItemIds).toEqual([]);
    expect(result.overdueItems).toHaveLength(1);
    expect(result.overdueItems[0].id).toBe('already-missed');
  });

  it('orders overdue items chronologically', () => {
    const items: PlanItemRow[] = [
      {
        ...baseItem,
        id: 'item-wed',
        start_at: '2026-11-18T13:30:00.000Z',
        end_at: '2026-11-18T14:30:00.000Z',
        status: 'scheduled',
      },
      {
        ...baseItem,
        id: 'item-mon',
        start_at: '2026-11-16T13:30:00.000Z',
        end_at: '2026-11-16T14:30:00.000Z',
        status: 'scheduled',
      },
    ];

    const result = detectMissedItems(items, '2026-11-20T15:00:00.000Z');
    expect(result.overdueItems.map((it) => it.id)).toEqual(['item-mon', 'item-wed']);
  });
});
