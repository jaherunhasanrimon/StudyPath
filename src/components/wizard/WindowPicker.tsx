'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Availability, Weekday, Window } from '@/modules/scheduler/types';
import { timeToMinutes } from '@/modules/scheduler/schema';
import { toBanglaDigits } from '@/modules/youtube/duration';

interface WindowPickerProps {
  availability: Availability;
  onChange: (availability: Availability) => void;
}

const WEEKDAYS: Weekday[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

const DAY_LABELS_BN: Record<Weekday, string> = {
  sat: 'শনি',
  sun: 'রবি',
  mon: 'সোম',
  tue: 'মঙ্গল',
  wed: 'বুধ',
  thu: 'বৃহঃ',
  fri: 'শুক্র',
};

const DAY_LABELS_EN: Record<Weekday, string> = {
  sat: 'Sat',
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
};

export function WindowPicker({ availability, onChange }: WindowPickerProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [sameForAll, setSameForAll] = useState(true);

  // Common default time range if day gets enabled
  const defaultWindow: Window = { start: '19:30', end: '22:00' };

  // Calculate total weekly hours
  let totalWeeklyMinutes = 0;
  for (const day of WEEKDAYS) {
    for (const w of availability[day]) {
      totalWeeklyMinutes += Math.max(0, timeToMinutes(w.end) - timeToMinutes(w.start));
    }
  }

  const weeklyHours = Math.floor(totalWeeklyMinutes / 60);
  const weeklyMins = totalWeeklyMinutes % 60;
  const weeklyTimeString =
    locale === 'bn'
      ? `${toBanglaDigits(weeklyHours)} ঘণ্টা ${toBanglaDigits(weeklyMins)} মিনিট`
      : `${weeklyHours} h ${weeklyMins} min`;

  const toggleDay = (day: Weekday) => {
    const isCurrentlyActive = availability[day].length > 0;
    const newAvail: Availability = { ...availability };

    if (isCurrentlyActive) {
      newAvail[day] = [];
    } else {
      // Find template window from another active day if sameForAll
      const activeWindow =
        sameForAll && Object.values(availability).flat()[0]
          ? Object.values(availability).flat()[0]
          : defaultWindow;
      newAvail[day] = [{ ...activeWindow }];
    }

    onChange(newAvail);
  };

  const updateDayTime = (day: Weekday, field: 'start' | 'end', value: string) => {
    const currentWindow = availability[day][0] || defaultWindow;
    const updatedWindow = { ...currentWindow, [field]: value };

    const newAvail: Availability = { ...availability };

    if (sameForAll) {
      // Apply to all currently active days
      for (const d of WEEKDAYS) {
        if (newAvail[d].length > 0) {
          newAvail[d] = [{ ...updatedWindow }];
        }
      }
    } else {
      newAvail[day] = [updatedWindow];
    }

    onChange(newAvail);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-ink">{t('pace.days')}</label>
        <span className="text-xs font-medium text-slate">
          {t('pace.weeklyTime', { time: weeklyTimeString })}
        </span>
      </div>

      {/* 7 Day Chips */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label={t('pace.days')}>
        {WEEKDAYS.map((day) => {
          const isActive = availability[day].length > 0;
          const label = locale === 'bn' ? DAY_LABELS_BN[day] : DAY_LABELS_EN[day];
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              aria-pressed={isActive}
              className={`rounded-button py-2.5 sm:py-3 text-sm font-semibold transition-all flex flex-col items-center justify-center border ${
                isActive
                  ? 'bg-river text-paper border-river shadow-xs'
                  : 'bg-surface text-slate border-border hover:bg-mist/30 hover:text-ink'
              }`}
              style={{ minHeight: '44px' }}
            >
              <span>{label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-paper mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Same for all selected days checkbox */}
      <div className="flex items-center gap-2 pt-1">
        <input
          id="same-for-all-days"
          type="checkbox"
          checked={sameForAll}
          onChange={(e) => setSameForAll(e.target.checked)}
          className="h-4 w-4 rounded border-border text-river focus:ring-river"
        />
        <label htmlFor="same-for-all-days" className="text-xs text-slate cursor-pointer">
          {t('pace.sameForAllDays')}
        </label>
      </div>

      {/* Time Ranges for Active Days */}
      <div className="space-y-2 pt-1">
        {sameForAll ? (
          // Single unified time selector when sameForAll is true
          (() => {
            const firstActiveDay = WEEKDAYS.find((d) => availability[d].length > 0);
            if (!firstActiveDay) return null;
            const win = availability[firstActiveDay][0] || defaultWindow;
            return (
              <div className="p-3 bg-surface border border-border rounded-input flex items-center justify-between gap-3 text-sm">
                <span className="text-ink font-medium text-xs sm:text-sm">
                  {locale === 'bn' ? 'পড়ার সময়' : 'Study window'}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={win.start}
                    onChange={(e) => updateDayTime(firstActiveDay, 'start', e.target.value)}
                    className="border border-border rounded-input bg-surface px-2.5 py-1.5 text-ink text-sm font-mono focus:border-river focus:ring-0"
                    style={{ minHeight: '40px' }}
                  />
                  <span className="text-slate">→</span>
                  <input
                    type="time"
                    value={win.end}
                    onChange={(e) => updateDayTime(firstActiveDay, 'end', e.target.value)}
                    className="border border-border rounded-input bg-surface px-2.5 py-1.5 text-ink text-sm font-mono focus:border-river focus:ring-0"
                    style={{ minHeight: '40px' }}
                  />
                </div>
              </div>
            );
          })()
        ) : (
          // Per-day time selectors when sameForAll is false
          WEEKDAYS.filter((d) => availability[d].length > 0).map((day) => {
            const win = availability[day][0] || defaultWindow;
            const label = locale === 'bn' ? DAY_LABELS_BN[day] : DAY_LABELS_EN[day];
            return (
              <div
                key={day}
                className="p-3 bg-surface border border-border rounded-input flex items-center justify-between gap-3 text-sm"
              >
                <span className="font-medium text-ink w-12">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={win.start}
                    onChange={(e) => updateDayTime(day, 'start', e.target.value)}
                    className="border border-border rounded-input bg-surface px-2.5 py-1.5 text-ink text-sm font-mono focus:border-river focus:ring-0"
                    style={{ minHeight: '40px' }}
                  />
                  <span className="text-slate">→</span>
                  <input
                    type="time"
                    value={win.end}
                    onChange={(e) => updateDayTime(day, 'end', e.target.value)}
                    className="border border-border rounded-input bg-surface px-2.5 py-1.5 text-ink text-sm font-mono focus:border-river focus:ring-0"
                    style={{ minHeight: '40px' }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
