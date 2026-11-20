/**
 * tests/unit/scheduler-golden.test.ts
 *
 * Mandatory Golden Example from docs/architecture.md §7.7.
 * Must match the specification down to the exact minute.
 */

import { describe, it, expect } from 'vitest';
import { buildPlan } from '@/modules/scheduler';
import { Video, Prefs } from '@/modules/scheduler/types';

describe('Scheduler Golden Example (architecture.md §7.7)', () => {
  it('reproduces the golden schedule and summary exactly', () => {
    // 10 videos of 60 minutes each
    const videos: Video[] = Array.from({ length: 10 }, (_, i) => ({
      id: `v${i + 1}`,
      title: `Class ${i + 1}`,
      durationSec: 3600,
      position: i,
      available: true,
      embeddable: true,
    }));

    // Preferences from §7.7:
    // start Sat 21 Nov 2026; windows Sat, Mon, Wed 19:30–22:00; speed 1; study factor 1;
    // quiz every 2 classes with 10 questions (15 min); assignment every 3 classes (30 min);
    // break 5 min; max 2 classes a day; no review, no buffer.
    const prefs: Prefs = {
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
      splitLongClasses: true,
      maxClassesPerDay: 2,
      breakMinutes: 5,
      quiz: {
        cadence: { every: 2 },
        questions: 10, // 15 min
      },
      assignment: {
        cadence: { every: 3 },
        minutes: 30,
      },
      review: {
        enabled: false,
        offsetsDays: [1, 3, 7, 21],
        microMinutes: 8,
        maxDailyMinutes: 20,
      },
      weeklyTest: {
        enabled: false,
        weekday: 'fri',
        minutes: 45,
      },
      buffer: { mode: 'none' },
      blackoutDates: [],
    };

    const plan = buildPlan(videos, prefs);

    // Verify Summary
    expect(plan.summary.studyDays).toBe(7);
    expect(plan.summary.lastDate).toBe('2026-12-05');
    expect(plan.summary.plannedMinutes).toBe(765); // 600 class + 75 quiz + 90 assignment
    expect(plan.summary.classes).toBe(10);
    expect(plan.summary.videoMinutes).toBe(600);

    // Expected Schedule Table (architecture.md §7.7)
    const expectedSchedule = [
      // Sat 21 Nov
      { date: '2026-11-21', start: '19:30', end: '20:30', type: 'class', label: 'Class 1' },
      { date: '2026-11-21', start: '20:35', end: '21:35', type: 'class', label: 'Class 2' },
      { date: '2026-11-21', start: '21:40', end: '21:55', type: 'quiz', label: 'Quiz (classes 1–2)' },
      // Mon 23 Nov
      { date: '2026-11-23', start: '19:30', end: '20:30', type: 'class', label: 'Class 3' },
      { date: '2026-11-23', start: '20:35', end: '21:05', type: 'assignment', label: 'Assignment (classes 1–3)' },
      // Wed 25 Nov
      { date: '2026-11-25', start: '19:30', end: '20:30', type: 'class', label: 'Class 4' },
      { date: '2026-11-25', start: '20:35', end: '20:50', type: 'quiz', label: 'Quiz (classes 3–4)' },
      { date: '2026-11-25', start: '20:55', end: '21:55', type: 'class', label: 'Class 5' },
      // Sat 28 Nov
      { date: '2026-11-28', start: '19:30', end: '20:30', type: 'class', label: 'Class 6' },
      { date: '2026-11-28', start: '20:35', end: '20:50', type: 'quiz', label: 'Quiz (classes 5–6)' },
      { date: '2026-11-28', start: '20:55', end: '21:25', type: 'assignment', label: 'Assignment (classes 4–6)' },
      // Mon 30 Nov
      { date: '2026-11-30', start: '19:30', end: '20:30', type: 'class', label: 'Class 7' },
      { date: '2026-11-30', start: '20:35', end: '21:35', type: 'class', label: 'Class 8' },
      { date: '2026-11-30', start: '21:40', end: '21:55', type: 'quiz', label: 'Quiz (classes 7–8)' },
      // Wed 2 Dec
      { date: '2026-12-02', start: '19:30', end: '20:30', type: 'class', label: 'Class 9' },
      { date: '2026-12-02', start: '20:35', end: '21:05', type: 'assignment', label: 'Assignment (classes 7–9)' },
      // Sat 5 Dec
      { date: '2026-12-05', start: '19:30', end: '20:30', type: 'class', label: 'Class 10' },
      { date: '2026-12-05', start: '20:35', end: '20:50', type: 'quiz', label: 'Quiz (classes 9–10)' },
    ];

    expect(plan.items).toHaveLength(expectedSchedule.length);

    plan.items.forEach((item, idx) => {
      const exp = expectedSchedule[idx];
      expect(item.date).toBe(exp.date);
      expect(item.start).toBe(exp.start);
      expect(item.end).toBe(exp.end);
      expect(item.type).toBe(exp.type);
      expect(item.label).toBe(exp.label);
    });

    // Feasibility is 'tight' because Sat 21 Nov uses 135/150 min (90% > 85% capacity per §7.3)
    expect(plan.feasibility.status).toBe('tight');
    // inputHash should be non-empty string
    expect(plan.inputHash).toMatch(/^[0-9a-f]{16}$/);
    expect(plan.engineVersion).toBe('1.0.0');
  });
});
