import { describe, it, expect } from 'vitest';
import {
  calculateAdherence,
  calculateWeeklyMinutes,
  calculateQuizScoreTrend,
  calculateUpcomingWorkload,
  determinePlanHealth,
  calculateStreak,
} from '@/modules/learning/progress';

describe('Progress Dashboard Engine (architecture.md §13 & phases.md §1 Phase 5)', () => {
  const timezone = 'Asia/Dhaka';

  it('calculates adherence rate accurately based on completed vs scheduled items', () => {
    const items = [
      { id: '1', status: 'completed' as const, scheduledDate: '2026-11-18', completedAt: '2026-11-18T10:00:00Z' },
      { id: '2', status: 'completed' as const, scheduledDate: '2026-11-19', completedAt: '2026-11-19T11:00:00Z' },
      { id: '3', status: 'skipped' as const, scheduledDate: '2026-11-20', completedAt: null },
      { id: '4', status: 'pending' as const, scheduledDate: '2026-11-20', completedAt: null },
    ];

    const result = calculateAdherence(items);
    expect(result.totalCount).toBe(4);
    expect(result.completedCount).toBe(2);
    expect(result.rate).toBe(50); // 2/4 = 50%
  });

  it('calculates weekly study minutes and comparison to target', () => {
    const nowIso = '2026-11-20T12:00:00Z';
    const sessions = [
      // 30 mins 2 days ago (this week)
      { durationSeconds: 1800, studiedAt: '2026-11-18T10:00:00Z' },
      // 45 mins yesterday (this week)
      { durationSeconds: 2700, studiedAt: '2026-11-19T10:00:00Z' },
      // 60 mins last week
      { durationSeconds: 3600, studiedAt: '2026-11-10T10:00:00Z' },
    ];

    const result = calculateWeeklyMinutes(sessions, nowIso, 120, timezone);
    expect(result.thisWeekMinutes).toBe(75); // 30 + 45
    expect(result.lastWeekMinutes).toBe(60);
    expect(result.targetMinutes).toBe(120);
    expect(result.percentOfTarget).toBe(63); // round(75/120 * 100) = 63%
  });

  it('computes quiz score trends and average percentage', () => {
    const attempts = [
      { score: 8, maxScore: 10, submittedAt: '2026-11-15T10:00:00Z' }, // 80%
      { score: 9, maxScore: 10, submittedAt: '2026-11-18T10:00:00Z' }, // 90%
      { score: 10, maxScore: 10, submittedAt: '2026-11-20T10:00:00Z' }, // 100%
    ];

    const result = calculateQuizScoreTrend(attempts);
    expect(result.totalAttempts).toBe(3);
    expect(result.averageScore).toBe(90); // (80 + 90 + 100)/3
    expect(result.recentScores.length).toBe(3);
    expect(result.recentScores[2].percentage).toBe(100);
  });

  it('determines plan health objectively and calmly without guilt', () => {
    expect(determinePlanHealth(95, 0)).toBe('on_track');
    expect(determinePlanHealth(80, 1)).toBe('on_track');
    expect(determinePlanHealth(50, 4)).toBe('behind');
  });

  it('aggregates upcoming 7-day workload by day and type', () => {
    const referenceDate = '2026-11-20';
    const items = [
      { type: 'video' as const, date: '2026-11-21', durationSeconds: 1800 },
      { type: 'quiz' as const, date: '2026-11-21', durationSeconds: 600 },
      { type: 'assignment' as const, date: '2026-11-22', durationSeconds: 1200 },
      { type: 'video' as const, date: '2026-11-29', durationSeconds: 1800 }, // outside 7 days
    ];

    const workload = calculateUpcomingWorkload(items, referenceDate, timezone);
    expect(workload.next7DaysCount).toBe(3);
    expect(workload.next7DaysMinutes).toBe(60); // (1800 + 600 + 1200) / 60 = 60 mins
    expect(workload.byDay.length).toBe(7);
  });

  it('calculates streak correctly and safely handles gaps', () => {
    const today = '2026-11-20';
    const activeDates = ['2026-11-20', '2026-11-19', '2026-11-18', '2026-11-16'];

    const streak = calculateStreak(activeDates, today, timezone);
    expect(streak.currentStreak).toBe(3); // 20, 19, 18
    expect(streak.activeToday).toBe(true);
    expect(streak.longestStreak).toBe(3);
  });
});
