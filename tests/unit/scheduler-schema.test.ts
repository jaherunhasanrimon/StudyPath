/**
 * Unit tests for scheduler Zod schemas and validation helpers.
 */
import { describe, it, expect } from 'vitest';
import {
  WindowSchema,
  AvailabilitySchema,
  CadenceSchema,
  VideoSchema,
  PrefsSchema,
  timeToMinutes,
  minutesToTime,
} from '@/modules/scheduler/schema';

describe('Scheduler Schemas & Helpers', () => {
  it('converts time to minutes and vice versa', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('19:30')).toBe(19 * 60 + 30); // 1170
    expect(timeToMinutes('23:59')).toBe(23 * 60 + 59);

    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(1170)).toBe('19:30');
    expect(minutesToTime(1439)).toBe('23:59');
  });

  it('validates window times and rejects end <= start', () => {
    const valid = WindowSchema.safeParse({ start: '19:30', end: '22:00' });
    expect(valid.success).toBe(true);

    const equal = WindowSchema.safeParse({ start: '20:00', end: '20:00' });
    expect(equal.success).toBe(false);

    const reversed = WindowSchema.safeParse({ start: '22:00', end: '19:30' });
    expect(reversed.success).toBe(false);

    const invalidFormat = WindowSchema.safeParse({ start: '7:30pm', end: '22:00' });
    expect(invalidFormat.success).toBe(false);

    const validAvailability = AvailabilitySchema.safeParse({
      mon: [{ start: '19:30', end: '22:00' }],
    });
    expect(validAvailability.success).toBe(true);
  });

  it('validates and applies defaults for PrefsSchema', () => {
    const parsed = PrefsSchema.parse({
      startDate: '2026-11-21',
    });

    expect(parsed.timezone).toBe('Asia/Dhaka');
    expect(parsed.playbackSpeed).toBe(1);
    expect(parsed.studyFactor).toBe(1.0);
    expect(parsed.maxClassesPerDay).toBe(2);
    expect(parsed.breakMinutes).toBe(5);
    expect(parsed.quiz.questions).toBe(10);
    expect(parsed.quiz.cadence).toEqual({ every: 2 });
    expect(parsed.assignment.minutes).toBe(30);
    expect(parsed.assignment.cadence).toEqual({ every: 3 });
    expect(parsed.availability.sat).toHaveLength(1);
    expect(parsed.availability.mon).toHaveLength(1);
    expect(parsed.availability.wed).toHaveLength(1);
  });

  it('validates pacing modes correctly', () => {
    const availabilityMode = PrefsSchema.safeParse({
      startDate: '2026-11-21',
      pacing: { mode: 'availability' },
    });
    expect(availabilityMode.success).toBe(true);

    const classesPerWeek = PrefsSchema.safeParse({
      startDate: '2026-11-21',
      pacing: { mode: 'classesPerWeek', value: 3 },
    });
    expect(classesPerWeek.success).toBe(true);

    const invalidClassesPerWeek = PrefsSchema.safeParse({
      startDate: '2026-11-21',
      pacing: { mode: 'classesPerWeek', value: 10 },
    });
    expect(invalidClassesPerWeek.success).toBe(false);

    const deadlineMode = PrefsSchema.safeParse({
      startDate: '2026-11-21',
      pacing: { mode: 'deadline', deadline: '2026-12-31' },
    });
    expect(deadlineMode.success).toBe(true);
  });

  it('validates video schema', () => {
    const validVideo = VideoSchema.safeParse({
      id: 'v123',
      title: 'Class 1: Calculus',
      durationSec: 3600,
      position: 0,
      available: true,
      embeddable: true,
    });
    expect(validVideo.success).toBe(true);

    const invalidDuration = VideoSchema.safeParse({
      id: 'v123',
      title: 'Class 1',
      durationSec: -50,
      position: 0,
    });
    expect(invalidDuration.success).toBe(false);
  });

  it('validates cadence options', () => {
    expect(CadenceSchema.safeParse({ every: 2 }).success).toBe(true);
    expect(CadenceSchema.safeParse({ every: 0 }).success).toBe(false);
    expect(CadenceSchema.safeParse({ at: 'end' }).success).toBe(true);
    expect(CadenceSchema.safeParse({ at: 'none' }).success).toBe(true);
    expect(CadenceSchema.safeParse({ at: 'invalid' }).success).toBe(false);
  });
});
