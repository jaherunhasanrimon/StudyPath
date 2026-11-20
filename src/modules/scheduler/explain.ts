/**
 * src/modules/scheduler/explain.ts
 *
 * Deterministic plan explanation generator.
 * Governed by docs/architecture.md §7.5:
 * - Generates bilingual summary: totals, days used, finish date, daily average.
 */

import { DateTime } from 'luxon';
import { PlanResult } from './types';
import { toBanglaDigits } from '../youtube/duration';

export function explainPlan(plan: PlanResult, locale: 'bn' | 'en' = 'bn'): string {
  const { summary } = plan;
  const dt = DateTime.fromISO(summary.lastDate);

  if (locale === 'en') {
    const formattedDate = dt.isValid ? dt.toFormat('ccc d LLL') : summary.lastDate;
    return `${summary.classes} classes, finishing ${formattedDate}, ${summary.studyDays} study days, about ${summary.avgMinutesPerStudyDay} minutes on a study day.`;
  }

  // Bengali translation
  const bnMonthNames = [
    '',
    'জানুয়ারি',
    'ফেব্রুয়ারি',
    'মার্চ',
    'এপ্রিল',
    'মে',
    'জুন',
    'জুলাই',
    'আগস্ট',
    'সেপ্টেম্বর',
    'অক্টোবর',
    'নভেম্বর',
    'ডিসেম্বর',
  ];
  const bnWeekdays = ['', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি', 'রবি'];

  let formattedDateBn = summary.lastDate;
  if (dt.isValid) {
    const weekdayName = bnWeekdays[dt.weekday];
    const dayDigits = toBanglaDigits(dt.day);
    const monthName = bnMonthNames[dt.month];
    formattedDateBn = `${weekdayName} ${dayDigits} ${monthName}`;
  }

  const classesBn = toBanglaDigits(summary.classes);
  const studyDaysBn = toBanglaDigits(summary.studyDays);
  const avgMinBn = toBanglaDigits(summary.avgMinutesPerStudyDay);

  return `${classesBn}টি ক্লাস, শেষ হবে ${formattedDateBn}, ${studyDaysBn}টি পড়ার দিন, দিনে গড়ে প্রায় ${avgMinBn} মিনিট।`;
}
