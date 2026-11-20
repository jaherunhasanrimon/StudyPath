/**
 * src/modules/scheduler/ics.ts
 *
 * Generates RFC 5545 iCalendar (.ics) export.
 * Governed by docs/architecture.md §7.5:
 * - One event per item.
 * - UID = ${planId}-${itemId}@dishari.
 * - DTSTART;TZID=Asia/Dhaka.
 * - 15-minute VALARM reminder.
 * - Link to /class/:itemId in description.
 */

import { PlanResult } from './types';

export interface IcsOptions {
  planId: string;
  baseUrl: string;
  calName: string;
  timezone?: string;
}

function formatIcsDateTime(dateStr: string, timeStr: string): string {
  // dateStr: YYYY-MM-DD -> YYYYMMDD
  // timeStr: HH:mm -> HHmm00
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}`;
}

export function toIcs(plan: PlanResult, opts: IcsOptions): string {
  const { planId, baseUrl, calName, timezone = 'Asia/Dhaka' } = opts;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dishari//StudyPath//BN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
    `X-WR-TIMEZONE:${timezone}`,
  ];

  for (const item of plan.items) {
    const startDt = formatIcsDateTime(item.date, item.start);
    const endDt = formatIcsDateTime(item.date, item.end);
    const uid = `${planId}-${item.id}@dishari`;
    const url = `${baseUrl}/class/${item.id}`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatIcsDateTime(item.date, item.start)}Z`,
      `DTSTART;TZID=${timezone}:${startDt}`,
      `DTEND;TZID=${timezone}:${endDt}`,
      `SUMMARY:${item.label}`,
      `DESCRIPTION:${url}`,
      `URL:${url}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${item.label}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
