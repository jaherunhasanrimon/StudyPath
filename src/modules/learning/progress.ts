/**
 * Progress Statistics Engine (architecture.md §13 & phases.md §1 Phase 5)
 * Pure domain logic: adherence, minutes studied, quiz trends, workload, and plan health.
 * Non-judgmental, calm calculations with no PII.
 */
import { DateTime } from 'luxon';

export interface PlanItemProgress {
  id: string;
  status: 'pending' | 'completed' | 'skipped' | 'missed';
  scheduledDate: string; // YYYY-MM-DD
  completedAt: string | null; // ISO
}

export interface StudySessionHistory {
  durationSeconds: number;
  studiedAt: string; // ISO
}

export interface QuizAttemptRecord {
  score: number;
  maxScore: number;
  submittedAt: string; // ISO
}

export interface UpcomingItemRecord {
  type: 'video' | 'quiz' | 'assignment';
  date: string; // YYYY-MM-DD
  durationSeconds: number;
}

export interface AdherenceResult {
  rate: number; // 0 - 100
  completedCount: number;
  totalCount: number;
  onTimeCount: number;
}

export interface WeeklyMinutesResult {
  thisWeekMinutes: number;
  lastWeekMinutes: number;
  targetMinutes: number;
  percentOfTarget: number;
}

export interface QuizScoreTrendResult {
  averageScore: number; // 0 - 100
  recentScores: {
    date: string;
    score: number;
    maxScore: number;
    percentage: number;
  }[];
  totalAttempts: number;
}

export interface WorkloadDaySummary {
  date: string;
  classCount: number;
  quizCount: number;
  assignmentCount: number;
  totalMinutes: number;
}

export interface UpcomingWorkloadResult {
  next7DaysCount: number;
  next7DaysMinutes: number;
  byDay: WorkloadDaySummary[];
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
}

export type PlanHealth = 'on_track' | 'behind' | 'completed';

/**
 * Calculates routine adherence rate based on items scheduled to date.
 */
export function calculateAdherence(items: PlanItemProgress[]): AdherenceResult {
  if (items.length === 0) {
    return { rate: 100, completedCount: 0, totalCount: 0, onTimeCount: 0 };
  }

  const completed = items.filter((i) => i.status === 'completed');
  const onTime = completed.filter((i) => {
    if (!i.completedAt) return false;
    const completedDate = i.completedAt.split('T')[0];
    return completedDate <= i.scheduledDate;
  });

  const rate = Math.round((completed.length / items.length) * 100);

  return {
    rate,
    completedCount: completed.length,
    totalCount: items.length,
    onTimeCount: onTime.length,
  };
}

/**
 * Computes study minutes this week and last week relative to a reference ISO date.
 * Weeks are evaluated in the student's timezone (default Asia/Dhaka).
 */
export function calculateWeeklyMinutes(
  sessions: StudySessionHistory[],
  referenceIso: string,
  targetMinutes = 120,
  timezone = 'Asia/Dhaka'
): WeeklyMinutesResult {
  const ref = DateTime.fromISO(referenceIso, { zone: timezone });
  const startOfThisWeek = ref.startOf('week');
  const startOfLastWeek = startOfThisWeek.minus({ weeks: 1 });

  let thisWeekSec = 0;
  let lastWeekSec = 0;

  for (const s of sessions) {
    const sDt = DateTime.fromISO(s.studiedAt, { zone: timezone });
    if (!sDt.isValid) continue;

    if (sDt >= startOfThisWeek && sDt <= ref) {
      thisWeekSec += s.durationSeconds;
    } else if (sDt >= startOfLastWeek && sDt < startOfThisWeek) {
      lastWeekSec += s.durationSeconds;
    }
  }

  const thisWeekMinutes = Math.round(thisWeekSec / 60);
  const lastWeekMinutes = Math.round(lastWeekSec / 60);
  const percentOfTarget = targetMinutes > 0 ? Math.round((thisWeekMinutes / targetMinutes) * 100) : 100;

  return {
    thisWeekMinutes,
    lastWeekMinutes,
    targetMinutes,
    percentOfTarget,
  };
}

/**
 * Aggregates chronological quiz attempt scores into an average percentage and trend.
 */
export function calculateQuizScoreTrend(attempts: QuizAttemptRecord[]): QuizScoreTrendResult {
  if (attempts.length === 0) {
    return { averageScore: 0, recentScores: [], totalAttempts: 0 };
  }

  const recentScores = attempts.map((a) => {
    const percentage = a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0;
    return {
      date: a.submittedAt.split('T')[0],
      score: a.score,
      maxScore: a.maxScore,
      percentage,
    };
  });

  const sumPercentage = recentScores.reduce((acc, curr) => acc + curr.percentage, 0);
  const averageScore = Math.round(sumPercentage / recentScores.length);

  return {
    averageScore,
    recentScores,
    totalAttempts: attempts.length,
  };
}

/**
 * Determines plan health:
 * 'on_track' if adherence >= 70% and overdue count <= 2
 * 'behind' if adherence < 70% or overdue count > 2
 */
export function determinePlanHealth(adherenceRate: number, overdueCount: number): PlanHealth {
  if (adherenceRate >= 70 && overdueCount <= 2) {
    return 'on_track';
  }
  return 'behind';
}

/**
 * Aggregates upcoming workload for the next 7 days from reference date.
 */
export function calculateUpcomingWorkload(
  items: UpcomingItemRecord[],
  referenceDateYmd: string,
  timezone = 'Asia/Dhaka'
): UpcomingWorkloadResult {
  const ref = DateTime.fromISO(referenceDateYmd, { zone: timezone });

  const byDay: WorkloadDaySummary[] = [];
  const dayMap = new Map<string, WorkloadDaySummary>();

  for (let i = 0; i < 7; i++) {
    const dateStr = ref.plus({ days: i }).toISODate()!;
    const daySummary: WorkloadDaySummary = {
      date: dateStr,
      classCount: 0,
      quizCount: 0,
      assignmentCount: 0,
      totalMinutes: 0,
    };
    byDay.push(daySummary);
    dayMap.set(dateStr, daySummary);
  }

  let next7DaysCount = 0;
  let next7DaysMinutes = 0;

  for (const item of items) {
    const summary = dayMap.get(item.date);
    if (summary) {
      next7DaysCount++;
      const mins = Math.round(item.durationSeconds / 60);
      next7DaysMinutes += mins;
      summary.totalMinutes += mins;

      if (item.type === 'video') summary.classCount++;
      else if (item.type === 'quiz') summary.quizCount++;
      else if (item.type === 'assignment') summary.assignmentCount++;
    }
  }

  return {
    next7DaysCount,
    next7DaysMinutes,
    byDay,
  };
}

/**
 * Computes study streaks from a list of unique active dates (YYYY-MM-DD).
 */
export function calculateStreak(
  activeDatesYmd: string[],
  referenceDateYmd: string,
  timezone = 'Asia/Dhaka'
): StreakResult {
  if (activeDatesYmd.length === 0) {
    return { currentStreak: 0, longestStreak: 0, activeToday: false };
  }

  const dateSet = new Set(activeDatesYmd);
  const ref = DateTime.fromISO(referenceDateYmd, { zone: timezone });
  const todayStr = ref.toISODate()!;
  const yesterdayStr = ref.minus({ days: 1 }).toISODate()!;

  const activeToday = dateSet.has(todayStr);

  // Compute current streak
  let currentStreak = 0;
  let checkDate = activeToday ? ref : ref.minus({ days: 1 });

  // If inactive today and inactive yesterday, streak is 0
  if (!activeToday && !dateSet.has(yesterdayStr)) {
    currentStreak = 0;
  } else {
    while (dateSet.has(checkDate.toISODate()!)) {
      currentStreak++;
      checkDate = checkDate.minus({ days: 1 });
    }
  }

  // Compute longest streak
  const sortedDates = Array.from(dateSet).sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDate: DateTime | null = null;

  for (const d of sortedDates) {
    const current = DateTime.fromISO(d, { zone: timezone });
    if (!current.isValid) continue;

    if (prevDate && current.diff(prevDate, 'days').days === 1) {
      runningStreak++;
    } else {
      runningStreak = 1;
    }

    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    prevDate = current;
  }

  return {
    currentStreak,
    longestStreak,
    activeToday,
  };
}
