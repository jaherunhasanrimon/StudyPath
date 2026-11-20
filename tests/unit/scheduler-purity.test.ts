/**
 * tests/unit/scheduler-purity.test.ts
 *
 * Proves that modules/scheduler is completely pure and makes zero network calls.
 * Acceptance criteria 6 from docs/phases.md §2.
 */

import { describe, it, expect, vi } from 'vitest';
import { buildPlan, replan, toIcs } from '@/modules/scheduler';
import { Video, Prefs } from '@/modules/scheduler/types';

describe('Scheduler Purity Isolation', () => {
  it('makes zero network calls when fetch is blocked or throws', () => {
    // Poison global.fetch to strictly fail if called
    const fetchSpy = vi.fn().mockImplementation(() => {
      throw new Error('NETWORK CALL DETECTED: modules/scheduler must be pure!');
    });
    global.fetch = fetchSpy;

    const videos: Video[] = Array.from({ length: 20 }, (_, i) => ({
      id: `v${i + 1}`,
      title: `Class ${i + 1}`,
      durationSec: 3600,
      position: i,
      available: true,
      embeddable: true,
    }));

    const prefs: Prefs = {
      timezone: 'Asia/Dhaka',
      startDate: '2026-11-21',
      pacing: { mode: 'deadline', deadline: '2027-01-30' },
      availability: {
        mon: [{ start: '19:30', end: '22:00' }],
        tue: [],
        wed: [{ start: '19:30', end: '22:00' }],
        thu: [],
        fri: [{ start: '19:30', end: '22:00' }],
        sat: [{ start: '19:30', end: '22:00' }],
        sun: [],
      },
      playbackSpeed: 1.25,
      studyFactor: 1.1,
      grouping: { mode: 'one-per-class' },
      splitLongClasses: true,
      maxClassesPerDay: 2,
      breakMinutes: 5,
      quiz: { cadence: { every: 2 }, questions: 10 },
      assignment: { cadence: { every: 3 }, minutes: 30 },
      review: { enabled: true, offsetsDays: [1, 3, 7, 21], microMinutes: 8, maxDailyMinutes: 20 },
      weeklyTest: { enabled: true, weekday: 'fri', minutes: 45 },
      buffer: { mode: 'weekly-day' },
      blackoutDates: ['2026-12-25'],
    };

    // 1. buildPlan must not call fetch
    const plan = buildPlan(videos, prefs);
    expect(plan).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();

    // 2. toIcs must not call fetch
    const ics = toIcs(plan, {
      planId: 'p1',
      baseUrl: 'https://dishari.app',
      calName: 'Test Calendar',
    });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(fetchSpy).not.toHaveBeenCalled();

    // 3. replan must not call fetch
    const replanRes = replan(
      plan,
      { completedItemIds: [plan.items[0].id], completedAt: {} },
      '2026-11-23T12:00:00Z',
      'shift',
      videos,
      prefs
    );
    expect(replanRes.plan).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
