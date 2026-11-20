/**
 * tests/unit/scheduler-export.test.ts
 *
 * Tests for calendar export (toIcs) and explanation (explainPlan).
 */

import { describe, it, expect } from 'vitest';
import { buildPlan, toIcs, explainPlan } from '@/modules/scheduler';
import { Video, Prefs } from '@/modules/scheduler/types';

describe('Scheduler Exports & Explanations', () => {
  const videos: Video[] = Array.from({ length: 4 }, (_, i) => ({
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
    assignment: { cadence: { at: 'none' }, minutes: 30 },
    review: { enabled: false, offsetsDays: [1, 3, 7, 21], microMinutes: 8, maxDailyMinutes: 20 },
    weeklyTest: { enabled: false, weekday: 'fri', minutes: 45 },
    buffer: { mode: 'none' },
    blackoutDates: [],
  };

  it('generates valid RFC 5545 iCalendar content with 15-minute VALARM', () => {
    const plan = buildPlan(videos, prefs);
    const icsContent = toIcs(plan, {
      planId: 'plan-test-123',
      baseUrl: 'https://dishari.app',
      calName: 'Higher Math Study Plan',
      timezone: 'Asia/Dhaka',
    });

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('X-WR-CALNAME:Higher Math Study Plan');
    expect(icsContent).toContain('X-WR-TIMEZONE:Asia/Dhaka');
    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('UID:plan-test-123-');
    expect(icsContent).toContain('BEGIN:VALARM');
    expect(icsContent).toContain('TRIGGER:-PT15M');
    expect(icsContent).toContain('ACTION:DISPLAY');
    expect(icsContent).toContain('END:VALARM');
    expect(icsContent).toContain('END:VEVENT');
    expect(icsContent).toContain('END:VCALENDAR');
  });

  it('generates deterministic bilingual explanation summaries', () => {
    const plan = buildPlan(videos, prefs);

    const enExplanation = explainPlan(plan, 'en');
    expect(enExplanation).toContain('classes');
    expect(enExplanation).toContain('study days');
    expect(enExplanation).toContain('minutes on a study day');

    const bnExplanation = explainPlan(plan, 'bn');
    expect(bnExplanation).toContain('টি ক্লাস');
    expect(bnExplanation).toContain('টি পড়ার দিন');
    expect(bnExplanation).toContain('মিনিট');
  });
});
