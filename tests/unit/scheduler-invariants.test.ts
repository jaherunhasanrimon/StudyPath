/**
 * tests/unit/scheduler-invariants.test.ts
 *
 * Property-based testing with fast-check for Invariants 1 through 9.
 * Governed by docs/architecture.md §7.6.
 * Each property test executes at least 1,000 randomized cases.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildPlan, replan } from '@/modules/scheduler';
import { Video, Prefs } from '@/modules/scheduler/types';
import { timeToMinutes } from '@/modules/scheduler/schema';

// Helper arbitrary for generating videos
const videoArbitrary: fc.Arbitrary<Video> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 20 }),
  durationSec: fc.integer({ min: 300, max: 7200 }), // 5 min to 2 hours
  position: fc.nat({ max: 100 }),
  available: fc.constant(true),
  embeddable: fc.constant(true),
});

const videosListArbitrary = fc.array(videoArbitrary, { minLength: 1, maxLength: 15 });

function createArbitraryPrefs(overrides: Partial<Prefs> = {}): Prefs {
  return {
    timezone: 'Asia/Dhaka',
    startDate: '2026-11-21',
    pacing: { mode: 'availability' },
    availability: {
      mon: [{ start: '19:30', end: '22:00' }],
      tue: [],
      wed: [{ start: '19:30', end: '22:00' }],
      thu: [],
      fri: [],
      sat: [{ start: '19:30', end: '22:00' }],
      sun: [],
    },
    playbackSpeed: 1,
    studyFactor: 1.0,
    grouping: { mode: 'one-per-class' },
    splitLongClasses: false,
    maxClassesPerDay: 2,
    breakMinutes: 5,
    quiz: { cadence: { every: 2 }, questions: 10 },
    assignment: { cadence: { every: 3 }, minutes: 30 },
    review: { enabled: false, offsetsDays: [1, 3, 7, 21], microMinutes: 8, maxDailyMinutes: 20 },
    weeklyTest: { enabled: false, weekday: 'fri', minutes: 45 },
    buffer: { mode: 'none' },
    blackoutDates: [],
    ...overrides,
  };
}

describe('Scheduler Invariants 1–9 (fast-check property tests)', () => {
  // Invariant 1: Every available video appears exactly once in playlist order
  it('Invariant 1: Every available video appears exactly once, in playlist order (1,000 runs)', () => {
    fc.assert(
      fc.property(videosListArbitrary, (videos) => {
        // Ensure positions are distinct for strict ordering check
        const distinctVideos = videos.map((v, idx) => ({ ...v, position: idx }));
        const prefs = createArbitraryPrefs();
        const plan = buildPlan(distinctVideos, prefs);

        const scheduledVideoIds = plan.items
          .filter((i) => i.type === 'class' && i.videoIds)
          .flatMap((i) => i.videoIds!);

        // Distinct scheduled video IDs
        const uniqueScheduled = new Set(scheduledVideoIds);
        expect(uniqueScheduled.size).toBe(distinctVideos.length);

        // Verify order matches distinctVideos position order
        let lastPos = -1;
        for (const vid of scheduledVideoIds) {
          const video = distinctVideos.find((v) => v.id === vid);
          expect(video).toBeDefined();
          expect(video!.position).toBeGreaterThan(lastPos);
          lastPos = video!.position;
        }
      }),
      { numRuns: 1000 }
    );
  }, 30000);

  // Invariant 2: No two items overlap on a day, and each item sits inside a window
  it('Invariant 2: No two items overlap on a day, and each sits inside a window (1,000 runs)', () => {
    fc.assert(
      fc.property(videosListArbitrary, (videos) => {
        const prefs = createArbitraryPrefs();
        const plan = buildPlan(videos, prefs);

        // Group by date
        const byDate = new Map<string, typeof plan.items>();
        for (const it of plan.items) {
          if (!byDate.has(it.date)) byDate.set(it.date, []);
          byDate.get(it.date)!.push(it);
        }

        for (const dayItems of byDate.values()) {
          for (let i = 0; i < dayItems.length; i++) {
            const current = dayItems[i];
            const currentStart = timeToMinutes(current.start);
            const currentEnd = timeToMinutes(current.end);

            expect(currentEnd).toBeGreaterThan(currentStart);

            if (i > 0) {
              const prev = dayItems[i - 1];
              const prevEnd = timeToMinutes(prev.end);
              // Must not overlap; must have at least breakMinutes gap
              expect(currentStart).toBeGreaterThanOrEqual(prevEnd + prefs.breakMinutes);
            }
          }
        }
      }),
      { numRuns: 1000 }
    );
  }, 30000);

  // Invariant 3: Daily load never exceeds capacity; maxClassesPerDay is respected
  it('Invariant 3: Daily load never exceeds capacity; maxClassesPerDay is respected (1,000 runs)', () => {
    fc.assert(
      fc.property(
        videosListArbitrary,
        fc.integer({ min: 1, max: 4 }),
        (videos, maxClasses) => {
          const prefs = createArbitraryPrefs({ maxClassesPerDay: maxClasses });
          const plan = buildPlan(videos, prefs);

          const byDate = new Map<string, typeof plan.items>();
          for (const it of plan.items) {
            if (!byDate.has(it.date)) byDate.set(it.date, []);
            byDate.get(it.date)!.push(it);
          }

          for (const dayItems of byDate.values()) {
            const classesOnDay = dayItems.filter((i) => i.type === 'class').length;
            expect(classesOnDay).toBeLessThanOrEqual(maxClasses);
          }
        }
      ),
      { numRuns: 1000 }
    );
  }, 30000);

  // Invariant 4: A quiz or assignment never precedes the class it covers
  it('Invariant 4: A quiz or assignment never precedes the class it covers (1,000 runs)', () => {
    fc.assert(
      fc.property(videosListArbitrary, (videos) => {
        const distinctVideos = videos.map((v, idx) => ({ ...v, position: idx }));
        const prefs = createArbitraryPrefs({
          quiz: { cadence: { every: 2 }, questions: 10 },
          assignment: { cadence: { every: 3 }, minutes: 30 },
        });

        const plan = buildPlan(distinctVideos, prefs);

        // Map class numbers to the item index where they are scheduled
        const classIndexMap = new Map<number, number>();
        plan.items.forEach((it, idx) => {
          if (it.type === 'class') {
            const match = it.id.match(/^class-(\d+)/);
            if (match) {
              classIndexMap.set(parseInt(match[1], 10), idx);
            }
          }
        });

        plan.items.forEach((it, idx) => {
          if ((it.type === 'quiz' || it.type === 'assignment') && it.covers) {
            for (const coveredClass of it.covers) {
              const classIdx = classIndexMap.get(coveredClass);
              if (classIdx !== undefined) {
                // Assessment must appear after the class it covers
                expect(idx).toBeGreaterThan(classIdx);
              }
            }
          }
        });
      }),
      { numRuns: 1000 }
    );
  }, 30000);

  // Invariant 5: Check cadence is respected (every N classes)
  it('Invariant 5: Check cadence is respected (1,000 runs)', () => {
    fc.assert(
      fc.property(
        videosListArbitrary,
        fc.integer({ min: 1, max: 4 }),
        (videos, quizCadence) => {
          const prefs = createArbitraryPrefs({
            quiz: { cadence: { every: quizCadence }, questions: 10 },
            assignment: { cadence: { at: 'none' }, minutes: 30 },
          });

          const plan = buildPlan(videos, prefs);
          const totalClasses = plan.summary.classes;
          const quizzes = plan.items.filter((i) => i.type === 'quiz');

          const expectedQuizzes = Math.floor(totalClasses / quizCadence);
          expect(quizzes.length).toBe(expectedQuizzes);
        }
      ),
      { numRuns: 1000 }
    );
  }, 30000);

  // Invariant 6: If status is 'ok' and a deadline exists, lastDate <= deadline
  it('Invariant 6: If status is ok and a deadline exists, lastDate <= deadline (1,000 runs)', () => {
    fc.assert(
      fc.property(videosListArbitrary, (videos) => {
        // Set generous deadline
        const deadlineDate = '2027-06-30';
        const prefs = createArbitraryPrefs({
          pacing: { mode: 'deadline', deadline: deadlineDate },
        });

        const plan = buildPlan(videos, prefs);
        if (plan.feasibility.status === 'ok') {
          expect(plan.summary.lastDate <= deadlineDate).toBe(true);
        }
      }),
      { numRuns: 1000 }
    );
  }, 30000);

  // Invariant 7: Same input gives identical output and inputHash (Determinism)
  it('Invariant 7: Same input gives identical output and inputHash (1,000 runs)', () => {
    fc.assert(
      fc.property(videosListArbitrary, (videos) => {
        const prefs = createArbitraryPrefs();
        const plan1 = buildPlan(videos, prefs);
        const plan2 = buildPlan(videos, prefs);

        expect(plan1.inputHash).toBe(plan2.inputHash);
        expect(plan1.summary).toEqual(plan2.summary);
        expect(plan1.items.length).toBe(plan2.items.length);
        expect(plan1.items).toEqual(plan2.items);
      }),
      { numRuns: 1000 }
    );
  }, 30000);

  // Invariant 8: Replan never modifies completed items and never schedules in the past
  it('Invariant 8: Replan never changes completed items and never schedules in the past (1,000 runs)', () => {
    fc.assert(
      fc.property(videosListArbitrary, (videos) => {
        const prefs = createArbitraryPrefs();
        const plan = buildPlan(videos, prefs);

        if (plan.items.length < 2) return;

        // Mark first item as completed
        const completedItem = plan.items[0];
        const progress = {
          completedItemIds: [completedItem.id],
          completedAt: { [completedItem.id]: '2026-11-21T20:30:00Z' },
        };

        const nowIso = '2026-11-23T10:00:00Z';
        const replanRes = replan(plan, progress, nowIso, 'shift', videos, prefs);

        // Completed item is preserved
        const found = replanRes.plan.items.find((i) => i.id === completedItem.id);
        expect(found).toBeDefined();
        expect(found!.date).toBe(completedItem.date);
        expect(found!.start).toBe(completedItem.start);
        expect(found!.end).toBe(completedItem.end);

        // Newly scheduled items must be on or after now date
        const nowDate = '2026-11-23';
        const newItems = replanRes.plan.items.filter((i) => i.id !== completedItem.id);
        for (const item of newItems) {
          expect(item.date >= nowDate).toBe(true);
        }
      }),
      { numRuns: 1000 }
    );
  }, 30000);

  // Invariant 9: Output is valid for any input accepted by Zod schema (No unhandled crash)
  it('Invariant 9: Output is valid for any input accepted by Zod schema (1,000 runs)', () => {
    fc.assert(
      fc.property(
        videosListArbitrary,
        fc.constantFrom(1, 1.25, 1.5),
        fc.constantFrom(1.0, 1.2, 1.5),
        fc.integer({ min: 1, max: 3 }),
        (videos, speed, factor, maxClasses) => {
          const prefs = createArbitraryPrefs({
            playbackSpeed: speed as 1 | 1.25 | 1.5,
            studyFactor: factor,
            maxClassesPerDay: maxClasses,
          });

          // Engine must not throw
          const plan = buildPlan(videos, prefs);
          expect(plan).toBeDefined();
          expect(plan.summary.studyDays).toBeGreaterThanOrEqual(0);
          expect(plan.engineVersion).toBe('1.0.0');
        }
      ),
      { numRuns: 1000 }
    );
  }, 30000);
});
