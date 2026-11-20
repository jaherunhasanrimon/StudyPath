import { describe, it, expect } from 'vitest';
import {
  CreatePlanSchema,
  PatchPlanItemSchema,
  WatchProgressSchema,
  ReplanRequestSchema,
  NoteSchema,
} from '@/modules/plans/schema';
import { DEFAULT_AVAILABILITY } from '@/modules/scheduler/schema';

describe('Plans Zod Schemas Validation', () => {
  const validPrefs = {
    timezone: 'Asia/Dhaka',
    startDate: '2026-11-21',
    pacing: { mode: 'availability' as const },
    availability: DEFAULT_AVAILABILITY,
    playbackSpeed: 1,
    studyFactor: 1,
    grouping: { mode: 'one-per-class' as const },
    splitLongClasses: true,
    maxClassesPerDay: 2,
    breakMinutes: 5,
    quiz: { cadence: { every: 2 }, questions: 10 },
    assignment: { cadence: { every: 3 }, minutes: 30 },
    review: { enabled: false, offsetsDays: [1, 3, 7, 21], microMinutes: 8, maxDailyMinutes: 20 },
    weeklyTest: { enabled: false, weekday: 'fri' as const, minutes: 45 },
    buffer: { mode: 'none' as const },
    blackoutDates: [],
  };

  const validVideo = {
    id: 'vid-01',
    title: 'Class 01',
    durationSec: 1800,
    position: 0,
    available: true,
    embeddable: true,
  };

  it('validates a valid CreatePlan payload', () => {
    const parsed = CreatePlanSchema.safeParse({
      name: 'Higher Math Chapter 1',
      playlistId: 'PLmath123',
      prefs: validPrefs,
      videos: [validVideo],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects CreatePlan with empty videos array', () => {
    const parsed = CreatePlanSchema.safeParse({
      name: 'Higher Math Chapter 1',
      playlistId: 'PLmath123',
      prefs: validPrefs,
      videos: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('validates PatchPlanItem actions', () => {
    expect(PatchPlanItemSchema.safeParse({ action: 'complete' }).success).toBe(true);
    expect(PatchPlanItemSchema.safeParse({ action: 'skip' }).success).toBe(true);
    expect(
      PatchPlanItemSchema.safeParse({
        action: 'move',
        start_at: '2026-11-21T19:30:00.000Z',
        end_at: '2026-11-21T20:30:00.000Z',
      }).success
    ).toBe(true);
    expect(PatchPlanItemSchema.safeParse({ action: 'invalid' }).success).toBe(false);
  });

  it('validates WatchProgress updates', () => {
    const parsed = WatchProgressSchema.safeParse({
      videoId: 'vid-123',
      lastPositionSec: 300,
      maxPositionSec: 450,
      durationSec: 600,
    });
    expect(parsed.success).toBe(true);

    // Negative position should fail
    expect(
      WatchProgressSchema.safeParse({
        videoId: 'vid-123',
        lastPositionSec: -5,
        maxPositionSec: 10,
      }).success
    ).toBe(false);
  });

  it('validates ReplanRequest strategies', () => {
    expect(ReplanRequestSchema.safeParse({ strategy: 'shift' }).success).toBe(true);
    expect(ReplanRequestSchema.safeParse({ strategy: 'compress', confirm: true }).success).toBe(true);
    expect(ReplanRequestSchema.safeParse({ strategy: 'balanced' }).success).toBe(true);
    expect(ReplanRequestSchema.safeParse({ strategy: 'invalid' }).success).toBe(false);
  });

  it('validates NoteSchema', () => {
    expect(NoteSchema.safeParse({ videoId: 'vid-1', body: 'My study notes' }).success).toBe(true);
    expect(NoteSchema.safeParse({ videoId: '', body: 'Notes' }).success).toBe(false);
  });
});
