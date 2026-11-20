'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { PlanResult, Prefs, PlanItem } from '@/modules/scheduler/types';
import { toIcs } from '@/modules/scheduler/ics';
import { explainPlan } from '@/modules/scheduler/explain';
import { toBanglaDigits } from '@/modules/youtube/duration';

interface Step4PlanProps {
  plan: PlanResult;
  prefs: Prefs;
  onApplySuggestion: (updatedPrefs: Prefs) => void;
  onMoveItem?: (index: number, direction: 'up' | 'down') => void;
  onChangeSettings: () => void;
  onStartPlan?: () => void;
  savingPlan?: boolean;
}

export function Step4Plan({
  plan,
  prefs,
  onApplySuggestion,
  onMoveItem,
  onChangeSettings,
  onStartPlan,
  savingPlan = false,
}: Step4PlanProps) {
  const t = useTranslations();
  const locale = useLocale() as 'bn' | 'en';
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Group items by week
  const itemsByWeek: { weekNum: number; startDate: string; endDate: string; items: PlanItem[] }[] = [];
  if (plan.items.length > 0) {
    let currentWeekNum = 1;
    let currentWeekItems: PlanItem[] = [];
    let weekStart = plan.items[0].date;

    for (let i = 0; i < plan.items.length; i++) {
      const item = plan.items[i];
      if (i > 0 && Math.abs(new Date(item.date).getTime() - new Date(weekStart).getTime()) > 7 * 86400000) {
        itemsByWeek.push({
          weekNum: currentWeekNum++,
          startDate: weekStart,
          endDate: plan.items[i - 1].date,
          items: currentWeekItems,
        });
        currentWeekItems = [item];
        weekStart = item.date;
      } else {
        currentWeekItems.push(item);
      }
    }
    if (currentWeekItems.length > 0) {
      itemsByWeek.push({
        weekNum: currentWeekNum,
        startDate: weekStart,
        endDate: plan.items[plan.items.length - 1].date,
        items: currentWeekItems,
      });
    }
  }

  // Handle ICS download directly in browser
  const handleDownloadIcs = () => {
    try {
      const icsData = toIcs(plan, {
        planId: plan.inputHash,
        baseUrl: typeof window !== 'undefined' ? window.location.origin : 'https://dishari.app',
        calName: 'Dishari Pathway',
        timezone: prefs.timezone,
      });

      const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'dishari-pathway.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch {
      // Fallback
    }
  };

  const explanationText = explainPlan(plan, locale);

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (locale === 'bn') {
      return m > 0 ? `${toBanglaDigits(h)} ঘণ্টা ${toBanglaDigits(m)} মি.` : `${toBanglaDigits(h)} ঘণ্টা`;
    }
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-mist pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-river">
            {t('newPlan.step4')}
          </p>
          <h1
            className="text-ink font-semibold text-2xl sm:text-3xl mt-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('planPreview.title')}
          </h1>
        </div>
        <button
          type="button"
          onClick={onChangeSettings}
          className="text-sm font-medium text-river hover:underline self-start sm:self-auto"
        >
          ⚙️ {t('planPreview.changeSettings')}
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-surface border border-border rounded-sheet text-center">
          <p className="text-xs text-slate">{locale === 'bn' ? 'মোট ক্লাস' : 'Classes'}</p>
          <p className="text-lg font-bold text-ink mt-0.5">
            {locale === 'bn' ? toBanglaDigits(plan.summary.classes) : plan.summary.classes}
          </p>
        </div>
        <div className="p-3 bg-surface border border-border rounded-sheet text-center">
          <p className="text-xs text-slate">{locale === 'bn' ? 'পড়ার সময়' : 'Planned Time'}</p>
          <p className="text-lg font-bold text-ink mt-0.5">
            {formatHours(plan.summary.plannedMinutes)}
          </p>
        </div>
        <div className="p-3 bg-surface border border-border rounded-sheet text-center">
          <p className="text-xs text-slate">{locale === 'bn' ? 'শেষের তারিখ' : 'Finishes'}</p>
          <p className="text-lg font-bold text-ink mt-0.5 font-mono text-sm sm:text-base">
            {plan.summary.lastDate}
          </p>
        </div>
        <div className="p-3 bg-surface border border-border rounded-sheet text-center">
          <p className="text-xs text-slate">{locale === 'bn' ? 'পড়ার দিন' : 'Study Days'}</p>
          <p className="text-lg font-bold text-ink mt-0.5">
            {locale === 'bn' ? toBanglaDigits(plan.summary.studyDays) : plan.summary.studyDays}
          </p>
        </div>
      </div>

      {/* Feasibility Banner */}
      <div
        className={`rounded-sheet p-4 sm:p-5 border flex flex-col gap-3 ${
          plan.feasibility.status === 'ok'
            ? 'bg-paddy/10 border-paddy/30 text-ink'
            : plan.feasibility.status === 'tight'
            ? 'bg-marigold/15 border-marigold/40 text-ink'
            : 'bg-brick/10 border-brick/30 text-ink'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {plan.feasibility.status === 'ok' && (
              <span className="w-5 h-5 rounded-full bg-paddy text-paper flex items-center justify-center font-bold text-xs shrink-0">
                ✓
              </span>
            )}
            {plan.feasibility.status === 'tight' && (
              <span className="w-5 h-5 rounded-full bg-marigold text-ink flex items-center justify-center font-bold text-xs shrink-0">
                !
              </span>
            )}
            {plan.feasibility.status === 'impossible' && (
              <span className="w-5 h-5 rounded-full bg-brick text-paper flex items-center justify-center font-bold text-xs shrink-0">
                ✕
              </span>
            )}
            <span className="text-base font-semibold">
              {t(`feasible.${plan.feasibility.status}`)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowWhyModal(true)}
            className="text-xs font-semibold text-river underline hover:text-river/80"
          >
            {t('planPreview.whyThisPlan')}
          </button>
        </div>

        {plan.feasibility.reasons.length > 0 && (
          <ul className="text-xs text-slate space-y-1 list-disc list-inside">
            {plan.feasibility.reasons.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        )}

        {/* 1-Click Suggestions */}
        {plan.feasibility.suggestions.length > 0 && (
          <div className="pt-2 border-t border-mist/50 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate">
              {locale === 'bn' ? 'সুপারিশসমূহ (এক ক্লিকে প্রয়োগ করুন):' : 'Suggested fixes (one-click apply):'}
            </p>
            <div className="flex flex-wrap gap-2">
              {plan.feasibility.suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onApplySuggestion(sug.appliedPrefs)}
                  className="px-3 py-1.5 rounded-button text-xs font-medium bg-surface border border-border text-ink hover:border-river hover:text-river shadow-2xs transition-all flex items-center gap-1.5"
                  style={{ minHeight: '36px' }}
                >
                  <span>⚡</span>
                  <span>
                    {sug.type === 'speed' && t('planPreview.suggestionSpeed', { speed: sug.params.speed, date: sug.params.finishDate })}
                    {sug.type === 'longer_windows' && t('planPreview.suggestionLonger', { date: sug.params.finishDate })}
                    {sug.type === 'new_deadline' && t('planPreview.suggestionDeadline', { date: sug.params.newDeadline })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Week-by-Week Pathway Timeline */}
      <div className="space-y-6">
        {itemsByWeek.map((week) => (
          <div key={week.weekNum} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-river bg-river/10 px-2.5 py-0.5 rounded-full">
                {t('planPreview.week', { n: locale === 'bn' ? toBanglaDigits(week.weekNum) : week.weekNum })}
              </span>
              <span className="text-xs text-slate">
                {week.startDate} → {week.endDate}
              </span>
            </div>

            <div className="divide-y divide-mist rounded-sheet border border-border bg-surface overflow-hidden">
              {week.items.map((item, itemIdx) => (
                <div
                  key={item.id + itemIdx}
                  className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-mist/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Knot Icon */}
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.type === 'class'
                          ? 'bg-river/15 text-river'
                          : item.type === 'quiz'
                          ? 'bg-marigold/20 text-marigold'
                          : item.type === 'assignment'
                          ? 'bg-paddy/20 text-paddy'
                          : 'bg-slate/20 text-slate'
                      }`}
                    >
                      {item.type === 'class' ? '●' : item.type === 'quiz' ? '◆' : item.type === 'assignment' ? '■' : '▲'}
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{item.label}</p>
                      <p className="text-xs text-slate mt-0.5 font-mono">
                        {item.date} • {item.start}–{item.end} ({item.durationMin}m)
                      </p>
                    </div>
                  </div>

                  {/* Move Up/Down Controls if allowed */}
                  {onMoveItem && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onMoveItem(itemIdx, 'up')}
                        disabled={itemIdx === 0}
                        aria-label={`Move up: ${item.label}`}
                        className="p-1.5 rounded-input border border-border text-slate hover:text-ink disabled:opacity-30"
                        style={{ minWidth: '32px', minHeight: '32px' }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveItem(itemIdx, 'down')}
                        disabled={itemIdx === week.items.length - 1}
                        aria-label={`Move down: ${item.label}`}
                        className="p-1.5 rounded-input border border-border text-slate hover:text-ink disabled:opacity-30"
                        style={{ minWidth: '32px', minHeight: '32px' }}
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="pt-6 sticky bottom-0 bg-background/95 backdrop-blur-xs py-4 border-t border-mist flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={handleDownloadIcs}
          className="w-full sm:w-1/2 rounded-button border border-border bg-surface px-6 py-3.5 text-sm font-medium text-ink hover:bg-mist/30 hover:border-river transition-all flex items-center justify-center gap-2"
          style={{ minHeight: '44px' }}
        >
          <span>📅</span>
          <span>{downloadSuccess ? t('planPreview.calendarDownloaded') : t('planPreview.addToCalendar')}</span>
        </button>

        <button
          type="button"
          onClick={onStartPlan}
          disabled={savingPlan}
          className="w-full sm:w-1/2 rounded-button bg-river px-6 py-3.5 text-sm font-semibold text-paper hover:bg-river/90 shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ minHeight: '44px' }}
        >
          <span>🚀</span>
          <span>{savingPlan ? 'সংরক্ষণ হচ্ছে...' : t('planPreview.startPlan')}</span>
        </button>
      </div>

      {/* "Why this plan?" Explanation Modal / Drawer */}
      {showWhyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-surface rounded-sheet max-w-md w-full p-6 space-y-4 border border-border shadow-lg">
            <div className="flex items-center justify-between border-b border-mist pb-3">
              <h3 className="font-semibold text-lg text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                {t('planPreview.whyThisPlan')}
              </h3>
              <button
                type="button"
                onClick={() => setShowWhyModal(false)}
                className="text-slate hover:text-ink text-xl leading-none p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-ink leading-relaxed">
              <p>{explanationText}</p>
              <div className="p-3 bg-mist/30 rounded-input space-y-1 text-xs text-slate">
                <p>• {locale === 'bn' ? 'গতি:' : 'Speed:'} {prefs.playbackSpeed}×</p>
                <p>• {locale === 'bn' ? 'সর্বোচ্চ দৈনিক ক্লাস:' : 'Max classes/day:'} {prefs.maxClassesPerDay}</p>
                <p>• {locale === 'bn' ? 'বিরতি:' : 'Break:'} {prefs.breakMinutes}m</p>
                <p>• {locale === 'bn' ? 'টাইমজোন:' : 'Timezone:'} {prefs.timezone}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowWhyModal(false)}
              className="w-full py-2.5 rounded-button bg-river text-paper font-medium text-sm hover:bg-river/90 transition-colors"
            >
              {locale === 'bn' ? 'বুঝেছি' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
