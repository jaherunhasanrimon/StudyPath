'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Prefs, PacingMode } from '@/modules/scheduler/types';
import { WindowPicker } from './WindowPicker';

interface Step2PaceProps {
  prefs: Prefs;
  hasShortVideos: boolean;
  onChange: (updated: Prefs) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Pace({
  prefs,
  hasShortVideos,
  onChange,
  onNext,
  onBack,
}: Step2PaceProps) {
  const t = useTranslations();
  const locale = useLocale();

  const handlePacingModeChange = (mode: PacingMode['mode']) => {
    let newPacing: PacingMode;
    if (mode === 'availability') {
      newPacing = { mode: 'availability' };
    } else if (mode === 'classesPerWeek') {
      newPacing = { mode: 'classesPerWeek', value: 3 };
    } else if (mode === 'minutesPerDay') {
      newPacing = { mode: 'minutesPerDay', value: 60 };
    } else {
      // Deadline default 30 days ahead
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 30);
      newPacing = {
        mode: 'deadline',
        deadline: targetDate.toISOString().split('T')[0],
      };
    }
    onChange({ ...prefs, pacing: newPacing });
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="border-b border-mist pb-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-river">
          {t('newPlan.step2')}
        </p>
        <h1
          className="text-ink font-semibold text-2xl sm:text-3xl mt-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('pace.title')}
        </h1>
      </div>

      {/* Start Date Picker */}
      <div className="space-y-2">
        <label htmlFor="start-date" className="text-sm font-semibold text-ink">
          {t('pace.startDate')}
        </label>
        <input
          id="start-date"
          type="date"
          value={prefs.startDate}
          onChange={(e) => onChange({ ...prefs, startDate: e.target.value })}
          className="w-full sm:w-64 rounded-input border border-border bg-surface px-4 py-2.5 text-ink text-base focus:border-river focus:ring-0"
          style={{ minHeight: '44px' }}
        />
      </div>

      {/* WindowPicker: 7 Days & Time Windows */}
      <WindowPicker
        availability={prefs.availability}
        onChange={(avail) => onChange({ ...prefs, availability: avail })}
      />

      {/* Pacing Mode Segmented Control */}
      <div className="space-y-3 pt-2">
        <label className="text-sm font-semibold text-ink">{t('pace.mode')}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { id: 'availability', label: t('pace.modeFastest') },
              { id: 'classesPerWeek', label: t('pace.modeClassesPerWeek') },
              { id: 'minutesPerDay', label: t('pace.modeMinutesPerDay') },
              { id: 'deadline', label: t('pace.modeDeadline') },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handlePacingModeChange(m.id)}
              className={`p-3 text-xs sm:text-sm font-medium rounded-input border transition-all text-center flex items-center justify-center ${
                prefs.pacing.mode === m.id
                  ? 'bg-river text-paper border-river font-semibold shadow-xs'
                  : 'bg-surface text-slate border-border hover:bg-mist/30 hover:text-ink'
              }`}
              style={{ minHeight: '44px' }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Dynamic Inputs for chosen mode */}
        {prefs.pacing.mode === 'classesPerWeek' && (
          <div className="p-3 bg-surface border border-border rounded-input flex items-center gap-3">
            <label htmlFor="classes-per-week" className="text-sm text-ink font-medium">
              {locale === 'bn' ? 'সপ্তাহে ক্লাসের সংখ্যা:' : 'Classes per week:'}
            </label>
            <input
              id="classes-per-week"
              type="number"
              min={1}
              max={7}
              value={prefs.pacing.value}
              onChange={(e) =>
                onChange({
                  ...prefs,
                  pacing: {
                    mode: 'classesPerWeek',
                    value: Math.max(1, Math.min(7, parseInt(e.target.value, 10) || 1)),
                  },
                })
              }
              className="w-20 rounded-input border border-border bg-surface px-3 py-1.5 text-ink text-sm font-mono text-center"
              style={{ minHeight: '40px' }}
            />
          </div>
        )}

        {prefs.pacing.mode === 'minutesPerDay' && (
          <div className="p-3 bg-surface border border-border rounded-input flex items-center gap-3">
            <label htmlFor="minutes-per-day" className="text-sm text-ink font-medium">
              {locale === 'bn' ? 'প্রতিদিন পড়ার মিনিট:' : 'Max daily minutes:'}
            </label>
            <input
              id="minutes-per-day"
              type="number"
              step={15}
              min={15}
              max={360}
              value={prefs.pacing.value}
              onChange={(e) =>
                onChange({
                  ...prefs,
                  pacing: {
                    mode: 'minutesPerDay',
                    value: Math.max(15, parseInt(e.target.value, 10) || 60),
                  },
                })
              }
              className="w-24 rounded-input border border-border bg-surface px-3 py-1.5 text-ink text-sm font-mono text-center"
              style={{ minHeight: '40px' }}
            />
            <span className="text-xs text-slate">
              {locale === 'bn' ? 'মিনিট' : 'mins'}
            </span>
          </div>
        )}

        {prefs.pacing.mode === 'deadline' && (
          <div className="p-3 bg-surface border border-border rounded-input flex items-center gap-3">
            <label htmlFor="deadline-date" className="text-sm text-ink font-medium">
              {locale === 'bn' ? 'শেষ করার তারিখ:' : 'Target finish date:'}
            </label>
            <input
              id="deadline-date"
              type="date"
              value={prefs.pacing.deadline}
              onChange={(e) =>
                onChange({
                  ...prefs,
                  pacing: {
                    mode: 'deadline',
                    deadline: e.target.value,
                  },
                })
              }
              className="rounded-input border border-border bg-surface px-3 py-1.5 text-ink text-sm font-mono"
              style={{ minHeight: '40px' }}
            />
          </div>
        )}
      </div>

      {/* Playback Speed Segmented */}
      <div className="space-y-2 pt-2">
        <label className="text-sm font-semibold text-ink">{t('pace.speed')}</label>
        <div className="grid grid-cols-3 gap-2">
          {([1, 1.25, 1.5] as const).map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onChange({ ...prefs, playbackSpeed: spd })}
              className={`py-2.5 text-sm font-medium rounded-input border transition-all ${
                prefs.playbackSpeed === spd
                  ? 'bg-river text-paper border-river font-semibold shadow-xs'
                  : 'bg-surface text-slate border-border hover:bg-mist/30 hover:text-ink'
              }`}
              style={{ minHeight: '44px' }}
            >
              {spd}×
            </button>
          ))}
        </div>
      </div>

      {/* Study Factor Slider: 0% to 50% */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <label htmlFor="study-factor" className="text-sm font-semibold text-ink">
            {t('pace.studyFactor')}
          </label>
          <span className="text-xs font-semibold text-river font-mono">
            +{Math.round((prefs.studyFactor - 1.0) * 100)}%
          </span>
        </div>
        <input
          id="study-factor"
          type="range"
          min="1.0"
          max="1.5"
          step="0.05"
          value={prefs.studyFactor}
          onChange={(e) =>
            onChange({ ...prefs, studyFactor: parseFloat(e.target.value) })
          }
          className="w-full accent-river"
        />
        <div className="flex justify-between text-[11px] text-slate">
          <span>0% ({locale === 'bn' ? 'কেবল ভিডিও' : 'Exact video'})</span>
          <span>+25%</span>
          <span>+50% ({locale === 'bn' ? 'বিস্তারিত নোট' : 'In-depth notes'})</span>
        </div>
      </div>

      {/* Auto-grouping toggle (only shown when playlist has short clips) */}
      {hasShortVideos && (
        <div className="p-4 bg-surface border border-border rounded-input flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">{t('pace.groupShortVideos')}</p>
            <p className="text-xs text-slate mt-0.5">
              {locale === 'bn'
                ? '৫ মিনিটের কম দৈর্ঘ্যের ছোট ক্লিপগুলোকে ৪৫ মিনিটের ক্লাসে একত্র করবে।'
                : 'Merges short clips under 5m into focused 45-minute classes.'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={prefs.grouping.mode === 'auto-group'}
            onChange={(e) =>
              onChange({
                ...prefs,
                grouping: e.target.checked
                  ? { mode: 'auto-group', targetMin: 45, maxMin: 60 }
                  : { mode: 'one-per-class' },
              })
            }
            className="h-5 w-5 rounded border-border text-river focus:ring-river cursor-pointer"
          />
        </div>
      )}

      {/* Stepper Navigation Buttons */}
      <div className="pt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-1/3 rounded-button border border-border bg-surface px-4 py-3 text-sm font-medium text-slate hover:text-ink hover:bg-mist/30 transition-colors"
          style={{ minHeight: '44px' }}
        >
          {t('planPreview.back')}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="w-2/3 rounded-button bg-river px-6 py-3 text-base font-medium text-paper transition-colors hover:bg-river/90 shadow-xs"
          style={{ minHeight: '44px' }}
        >
          {t('planPreview.next')} →
        </button>
      </div>
    </div>
  );
}
