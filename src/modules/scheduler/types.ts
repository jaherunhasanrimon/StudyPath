/**
 * src/modules/scheduler/types.ts
 *
 * Core pure TypeScript interfaces for the scheduling engine.
 * Governed by docs/architecture.md §7.1.
 */

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface Window {
  start: string; // "HH:mm" 24h format, local
  end: string;   // "HH:mm" 24h format, local, end > start, same day
}

export type Availability = Record<Weekday, Window[]>;

export type Cadence =
  | { every: number }
  | { at: 'end' }
  | { at: 'none' };

export interface Video {
  id: string;
  title: string;
  durationSec: number;
  position: number;
  available: boolean;
  embeddable: boolean;
}

export type PacingMode =
  | { mode: 'availability' }
  | { mode: 'classesPerWeek'; value: number }
  | { mode: 'minutesPerDay'; value: number }
  | { mode: 'deadline'; deadline: string }; // 'YYYY-MM-DD'

export interface Prefs {
  timezone: string;          // IANA, default 'Asia/Dhaka'
  startDate: string;         // 'YYYY-MM-DD'
  pacing: PacingMode;
  availability: Availability;
  playbackSpeed: 1 | 1.25 | 1.5 | 1.75 | 2;
  studyFactor: number;       // 1.0–1.5: extra time for pauses and notes
  grouping:
    | { mode: 'one-per-class' }
    | { mode: 'auto-group'; targetMin: number; maxMin: number };
  splitLongClasses: boolean;
  maxClassesPerDay: number;  // default 2
  breakMinutes: number;      // default 5
  quiz: {
    cadence: Cadence;
    questions: 5 | 10 | 15 | 20;
  };
  assignment: {
    cadence: Cadence;
    minutes: number;         // default 30
  };
  review: {
    enabled: boolean;
    offsetsDays: number[];   // default [1, 3, 7, 21]
    microMinutes: number;    // default 8
    maxDailyMinutes: number; // default 20
  };
  weeklyTest: {
    enabled: boolean;
    weekday: Weekday;
    minutes: number;         // default 45
  };
  buffer:
    | { mode: 'none' }
    | { mode: 'weekly-day' }
    | { mode: 'ratio'; value: number }; // ratio between 0.0 and 0.5
  blackoutDates: string[];   // 'YYYY-MM-DD'[]
}

export type ItemType =
  | 'class'
  | 'quiz'
  | 'assignment'
  | 'review'
  | 'weekly_test'
  | 'buffer';

export interface PlanItem {
  id: string;
  seq: number;
  type: ItemType;
  date: string;               // 'YYYY-MM-DD'
  start: string;              // 'HH:mm'
  end: string;                // 'HH:mm'
  durationMin: number;
  videoIds?: string[];
  part?: {
    index: number;
    of: number;
    fromSec: number;
    toSec: number;
  };
  covers?: number[];          // 1-based class numbers covered (for quiz, assignment, etc.)
  dueDate?: string;           // 'YYYY-MM-DD'
  label: string;
}

export interface PlanSummary {
  classes: number;
  videoMinutes: number;
  plannedMinutes: number;
  firstDate: string;
  lastDate: string;
  studyDays: number;
  avgMinutesPerStudyDay: number;
}

export interface Suggestion {
  type: 'speed' | 'window' | 'cadence' | 'longer_windows' | 'new_deadline';
  labelKey: string;
  params: Record<string, string | number>;
  appliedPrefs: Prefs;
  computedFinishDate?: string;
}

export type FeasibilityStatus = 'ok' | 'tight' | 'impossible';

export interface FeasibilityResult {
  status: FeasibilityStatus;
  reasons: string[];
  suggestions: Suggestion[];
}

export interface PlanWarning {
  type: string;
  messageKey: string;
  count?: number;
}

export interface PlanResult {
  items: PlanItem[];
  summary: PlanSummary;
  feasibility: FeasibilityResult;
  warnings: PlanWarning[];
  engineVersion: string;
  inputHash: string;
}

export interface Progress {
  completedItemIds: string[];
  completedAt: Record<string, string>; // itemId -> ISO timestamp
}

export type ReplanStrategy = 'shift' | 'compress' | 'balanced';

export interface ReplanDiff {
  moved: {
    itemId: string;
    oldDate: string;
    newDate: string;
    oldStart: string;
    newStart: string;
  }[];
  added: PlanItem[];
  removed: string[];
}

export interface ReplanResult {
  plan: PlanResult;
  diff: ReplanDiff;
}
