'use client';

import { useTranslations } from 'next-intl';
import { Prefs } from '@/modules/scheduler/types';
import { CadenceSelector } from './CadenceSelector';

interface Step3ChecksProps {
  prefs: Prefs;
  totalClasses: number;
  onChange: (updated: Prefs) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Checks({
  prefs,
  totalClasses,
  onChange,
  onNext,
  onBack,
}: Step3ChecksProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="border-b border-mist pb-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-river">
          {t('newPlan.step3')}
        </p>
        <h1
          className="text-ink font-semibold text-2xl sm:text-3xl mt-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('checks.title')}
        </h1>
      </div>

      {/* Quiz Cadence Selector */}
      <div className="space-y-4 rounded-sheet border border-border bg-surface p-4 sm:p-5">
        <CadenceSelector
          label={t('checks.quizCadence')}
          value={prefs.quiz.cadence}
          totalClasses={totalClasses}
          itemType="quiz"
          onChange={(cadence) =>
            onChange({
              ...prefs,
              quiz: { ...prefs.quiz, cadence },
            })
          }
        />

        {/* Question Count (only if quiz is enabled) */}
        {!('at' in prefs.quiz.cadence && prefs.quiz.cadence.at === 'none') && (
          <div className="space-y-2 pt-2 border-t border-mist/50">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate">
              {t('checks.questionCount')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([5, 10, 15, 20] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...prefs,
                      quiz: { ...prefs.quiz, questions: count },
                    })
                  }
                  className={`py-2 text-sm font-medium rounded-input border transition-all ${
                    prefs.quiz.questions === count
                      ? 'bg-river text-paper border-river font-semibold shadow-xs'
                      : 'bg-surface text-slate border-border hover:bg-mist/30 hover:text-ink'
                  }`}
                  style={{ minHeight: '40px' }}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Assignment Cadence Selector */}
      <div className="space-y-4 rounded-sheet border border-border bg-surface p-4 sm:p-5">
        <CadenceSelector
          label={t('checks.assignmentCadence')}
          value={prefs.assignment.cadence}
          totalClasses={totalClasses}
          itemType="assignment"
          onChange={(cadence) =>
            onChange({
              ...prefs,
              assignment: { ...prefs.assignment, cadence },
            })
          }
        />

        {/* Assignment Duration (only if assignment is enabled) */}
        {!('at' in prefs.assignment.cadence && prefs.assignment.cadence.at === 'none') && (
          <div className="space-y-2 pt-2 border-t border-mist/50">
            <div className="flex items-center justify-between">
              <label htmlFor="assignment-minutes" className="text-xs font-semibold uppercase tracking-wider text-slate">
                {t('checks.assignmentMinutes')}
              </label>
              <span className="text-xs font-mono font-medium text-ink">
                {prefs.assignment.minutes} min
              </span>
            </div>
            <input
              id="assignment-minutes"
              type="range"
              min={15}
              max={60}
              step={5}
              value={prefs.assignment.minutes}
              onChange={(e) =>
                onChange({
                  ...prefs,
                  assignment: {
                    ...prefs.assignment,
                    minutes: parseInt(e.target.value, 10),
                  },
                })
              }
              className="w-full accent-river"
            />
          </div>
        )}
      </div>

      {/* Advanced Toggles */}
      <div className="space-y-3 pt-2">
        {/* Spaced Review Toggle */}
        <div className="p-4 bg-surface border border-border rounded-input flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">{t('checks.spacedReview')}</p>
            <p className="text-xs text-slate mt-0.5">{t('checks.spacedReviewDesc')}</p>
          </div>
          <input
            type="checkbox"
            checked={prefs.review.enabled}
            onChange={(e) =>
              onChange({
                ...prefs,
                review: { ...prefs.review, enabled: e.target.checked },
              })
            }
            className="h-5 w-5 rounded border-border text-river focus:ring-river cursor-pointer"
          />
        </div>

        {/* Weekly Test Toggle */}
        <div className="p-4 bg-surface border border-border rounded-input flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">{t('checks.weeklyTest')}</p>
            <p className="text-xs text-slate mt-0.5">{t('checks.weeklyTestDesc')}</p>
          </div>
          <input
            type="checkbox"
            checked={prefs.weeklyTest.enabled}
            onChange={(e) =>
              onChange({
                ...prefs,
                weeklyTest: { ...prefs.weeklyTest, enabled: e.target.checked },
              })
            }
            className="h-5 w-5 rounded border-border text-river focus:ring-river cursor-pointer"
          />
        </div>

        {/* Weekly Catch-Up Day Toggle */}
        <div className="p-4 bg-surface border border-border rounded-input flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">{t('checks.bufferDay')}</p>
            <p className="text-xs text-slate mt-0.5">{t('checks.bufferDayDesc')}</p>
          </div>
          <input
            type="checkbox"
            checked={prefs.buffer.mode === 'weekly-day'}
            onChange={(e) =>
              onChange({
                ...prefs,
                buffer: e.target.checked ? { mode: 'weekly-day' } : { mode: 'none' },
              })
            }
            className="h-5 w-5 rounded border-border text-river focus:ring-river cursor-pointer"
          />
        </div>
      </div>

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
          {t('planPreview.buildPlan')} ✨
        </button>
      </div>
    </div>
  );
}
