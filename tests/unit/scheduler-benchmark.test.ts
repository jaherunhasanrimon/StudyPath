/**
 * tests/unit/scheduler-benchmark.test.ts
 *
 * Performance benchmark: 300 videos in under 200 ms.
 * Benchmark requirement from docs/phases.md §2 Task 4.
 */

import { describe, it, expect } from 'vitest';
import { buildPlan } from '@/modules/scheduler';
import { Video, Prefs } from '@/modules/scheduler/types';

describe('Scheduler Performance Benchmark', () => {
  it('schedules a 300-video course in under 200 ms', () => {
    // Generate 300 videos of varying realistic durations (10 to 45 min)
    const videos: Video[] = Array.from({ length: 300 }, (_, i) => ({
      id: `vid_${String(i + 1).padStart(3, '0')}`,
      title: `Lecture ${i + 1}: Engineering Physics Topic`,
      durationSec: 600 + ((i * 37) % 2100), // between 10m and 45m
      position: i,
      available: true,
      embeddable: true,
    }));

    const prefs: Prefs = {
      timezone: 'Asia/Dhaka',
      startDate: '2026-11-21',
      pacing: { mode: 'availability' },
      availability: {
        mon: [{ start: '19:30', end: '22:00' }],
        tue: [{ start: '19:30', end: '22:00' }],
        wed: [{ start: '19:30', end: '22:00' }],
        thu: [{ start: '19:30', end: '22:00' }],
        fri: [{ start: '15:00', end: '18:00' }],
        sat: [{ start: '19:30', end: '22:00' }],
        sun: [{ start: '19:30', end: '22:00' }],
      },
      playbackSpeed: 1.25,
      studyFactor: 1.0,
      grouping: { mode: 'one-per-class' },
      splitLongClasses: false,
      maxClassesPerDay: 2,
      breakMinutes: 5,
      quiz: { cadence: { every: 2 }, questions: 10 },
      assignment: { cadence: { every: 5 }, minutes: 30 },
      review: { enabled: false, offsetsDays: [1, 3, 7, 21], microMinutes: 8, maxDailyMinutes: 20 },
      weeklyTest: { enabled: false, weekday: 'fri', minutes: 45 },
      buffer: { mode: 'none' },
      blackoutDates: [],
    };

    // Warm-up run
    buildPlan(videos.slice(0, 10), prefs);

    const startTime = performance.now();
    const plan = buildPlan(videos, prefs);
    const elapsedMs = performance.now() - startTime;

    expect(plan.items.length).toBeGreaterThan(300); // 300 classes + quizzes + assignments
    expect(plan.summary.classes).toBe(300);

    // Benchmark requirement: 300 videos in under 200 ms
    expect(elapsedMs).toBeLessThan(200);
  });
});
