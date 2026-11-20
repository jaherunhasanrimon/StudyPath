/**
 * src/modules/scheduler/schema.ts
 *
 * Zod schemas for validating scheduling inputs.
 * Governed by docs/architecture.md §7.1 - §7.2.
 */

import { z } from 'zod';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const WindowSchema = z
  .object({
    start: z.string().regex(TIME_REGEX, 'Start time must be HH:mm (24h format)'),
    end: z.string().regex(TIME_REGEX, 'End time must be HH:mm (24h format)'),
  })
  .refine((w) => timeToMinutes(w.end) > timeToMinutes(w.start), {
    message: 'Window end must be strictly after window start on the same day',
  });

export const WeekdaySchema = z.enum([
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
]);

export const AvailabilitySchema = z.object({
  mon: z.array(WindowSchema).default([]),
  tue: z.array(WindowSchema).default([]),
  wed: z.array(WindowSchema).default([]),
  thu: z.array(WindowSchema).default([]),
  fri: z.array(WindowSchema).default([]),
  sat: z.array(WindowSchema).default([]),
  sun: z.array(WindowSchema).default([]),
});

export const CadenceSchema = z.union([
  z.object({
    every: z.number().int().min(1, 'Cadence must be at least every 1 class'),
  }),
  z.object({
    at: z.literal('end'),
  }),
  z.object({
    at: z.literal('none'),
  }),
]);

export const VideoSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  durationSec: z.number().int().nonnegative(),
  position: z.number().int().nonnegative(),
  available: z.boolean().default(true),
  embeddable: z.boolean().default(true),
});

export const PacingModeSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('availability') }),
  z.object({
    mode: z.literal('classesPerWeek'),
    value: z.number().int().min(1).max(7),
  }),
  z.object({
    mode: z.literal('minutesPerDay'),
    value: z.number().int().min(15).max(720),
  }),
  z.object({
    mode: z.literal('deadline'),
    deadline: z.string().regex(DATE_REGEX, 'Deadline must be YYYY-MM-DD'),
  }),
]);

export const BufferModeSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none') }),
  z.object({ mode: z.literal('weekly-day') }),
  z.object({
    mode: z.literal('ratio'),
    value: z.number().min(0.0).max(0.5),
  }),
]);

export const GroupingModeSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('one-per-class') }),
  z.object({
    mode: z.literal('auto-group'),
    targetMin: z.number().int().min(10).max(180).default(45),
    maxMin: z.number().int().min(15).max(240).default(60),
  }),
]);

export const DEFAULT_AVAILABILITY = {
  mon: [{ start: '19:30', end: '22:00' }],
  tue: [],
  wed: [{ start: '19:30', end: '22:00' }],
  thu: [],
  fri: [],
  sat: [{ start: '19:30', end: '22:00' }],
  sun: [],
};

export const PrefsSchema = z.object({
  timezone: z.string().default('Asia/Dhaka'),
  startDate: z.string().regex(DATE_REGEX, 'startDate must be YYYY-MM-DD'),
  pacing: PacingModeSchema.default({ mode: 'availability' }),
  availability: AvailabilitySchema.default(DEFAULT_AVAILABILITY),
  playbackSpeed: z
    .union([
      z.literal(1),
      z.literal(1.25),
      z.literal(1.5),
      z.literal(1.75),
      z.literal(2),
    ])
    .default(1),
  studyFactor: z.number().min(1.0).max(1.5).default(1.0),
  grouping: GroupingModeSchema.default({ mode: 'one-per-class' }),
  splitLongClasses: z.boolean().default(true),
  maxClassesPerDay: z.number().int().min(1).default(2),
  breakMinutes: z.number().int().min(0).default(5),
  quiz: z
    .object({
      cadence: CadenceSchema.default({ every: 2 }),
      questions: z
        .union([
          z.literal(5),
          z.literal(10),
          z.literal(15),
          z.literal(20),
        ])
        .default(10),
    })
    .default({
      cadence: { every: 2 },
      questions: 10,
    }),
  assignment: z
    .object({
      cadence: CadenceSchema.default({ every: 3 }),
      minutes: z.number().int().min(10).max(180).default(30),
    })
    .default({
      cadence: { every: 3 },
      minutes: 30,
    }),
  review: z
    .object({
      enabled: z.boolean().default(false),
      offsetsDays: z.array(z.number().int().positive()).default([1, 3, 7, 21]),
      microMinutes: z.number().int().min(5).max(30).default(8),
      maxDailyMinutes: z.number().int().min(10).max(60).default(20),
    })
    .default({
      enabled: false,
      offsetsDays: [1, 3, 7, 21],
      microMinutes: 8,
      maxDailyMinutes: 20,
    }),
  weeklyTest: z
    .object({
      enabled: z.boolean().default(false),
      weekday: WeekdaySchema.default('fri'),
      minutes: z.number().int().min(15).max(120).default(45),
    })
    .default({
      enabled: false,
      weekday: 'fri',
      minutes: 45,
    }),
  buffer: BufferModeSchema.default({ mode: 'none' }),
  blackoutDates: z.array(z.string().regex(DATE_REGEX)).default([]),
});
