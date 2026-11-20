'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { PlanWithItems, PlanItemRow } from '@/modules/plans/types';
import { toBanglaDigits } from '@/modules/youtube/duration';
import { ReplanModal } from '@/components/replan/ReplanModal';

interface PathwayClientProps {
  plan: PlanWithItems;
  calendarUrl: string;
}

export function PathwayClient({ plan, calendarUrl }: PathwayClientProps) {
  const t = useTranslations('plans');
  const locale = useLocale();
  const router = useRouter();

  const [items, setItems] = useState<PlanItemRow[]>(plan.items);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showReplanModal, setShowReplanModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const missedItems = items.filter((it) => it.status === 'missed');
  const completedCount = items.filter((it) => it.status === 'done').length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  // First uncompleted item gets the marigold knot
  const nextItem = items.find((it) => it.status === 'scheduled' || it.status === 'missed');

  // Group items by week
  const itemsByWeek: { weekNum: number; startDate: string; endDate: string; items: PlanItemRow[] }[] = [];
  if (items.length > 0) {
    let currentWeekNum = 1;
    let currentWeekItems: PlanItemRow[] = [];
    let weekStart = items[0].start_at.slice(0, 10);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itDate = it.start_at.slice(0, 10);
      if (i > 0 && Math.abs(new Date(itDate).getTime() - new Date(weekStart).getTime()) > 7 * 86400000) {
        itemsByWeek.push({
          weekNum: currentWeekNum++,
          startDate: weekStart,
          endDate: items[i - 1].start_at.slice(0, 10),
          items: currentWeekItems,
        });
        currentWeekItems = [it];
        weekStart = itDate;
      } else {
        currentWeekItems.push(it);
      }
    }
    if (currentWeekItems.length > 0) {
      itemsByWeek.push({
        weekNum: currentWeekNum,
        startDate: weekStart,
        endDate: items[items.length - 1].start_at.slice(0, 10),
        items: currentWeekItems,
      });
    }
  }

  const handleItemAction = async (itemId: string, action: 'complete' | 'skip') => {
    setActionLoading(itemId);
    try {
      const res = await fetch(`/api/plans/${plan.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, status: action === 'complete' ? 'done' : 'skipped' } : it))
        );
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyCalendar = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <main id="main-content" className="max-w-[760px] mx-auto px-4 py-8 space-y-8">
      {/* Plan Header */}
      <div className="border-b border-mist pb-4 space-y-2">
        <div className="flex items-center justify-between">
          <Link href="/plans" className="text-xs font-medium text-slate hover:text-ink">
            ← সব রুটিন
          </Link>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-river/15 text-river font-mono">
            {t('version', { v: plan.version })}
          </span>
        </div>

        <h1
          className="text-2xl sm:text-3xl font-semibold text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {plan.name}
        </h1>

        {/* Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs text-slate">
            <span>{t('progress', { percent: locale === 'bn' ? toBanglaDigits(progressPercent) : progressPercent })}</span>
            <span>
              {locale === 'bn'
                ? `${toBanglaDigits(completedCount)} / ${toBanglaDigits(items.length)}`
                : `${completedCount} / ${items.length}`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-mist overflow-hidden">
            <div
              className="h-full bg-paddy transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Missed Classes Replan Notice */}
      {missedItems.length > 0 && (
        <div className="p-4 rounded-sheet border border-brick/40 bg-brick/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brick text-paper text-xs font-bold flex items-center justify-center">
              !
            </span>
            <p className="text-xs sm:text-sm font-semibold text-ink">
              {locale === 'bn'
                ? `${toBanglaDigits(missedItems.length)}টি ক্লাস বাদ পড়েছে। রুটিন পিছিয়ে ঠিক করে নিন।`
                : `${missedItems.length} classes missed. Replan to catch up.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowReplanModal(true)}
            className="px-3 py-1.5 rounded-button bg-river text-paper text-xs font-semibold hover:bg-river/90 transition-colors shrink-0"
          >
            রুটিন ঠিক করুন
          </button>
        </div>
      )}

      {/* Calendar Subscription Feed */}
      <div className="p-4 rounded-sheet border border-border bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <span>📅</span>
            <span>{t('calendarFeed')}</span>
          </p>
          <p className="text-[11px] text-slate">
            গুগল বা অ্যাপল ক্যালেন্ডারে লাইভ সিঙ্ক করতে এই লিঙ্কটি ব্যবহার করুন।
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyCalendar}
          className="px-3.5 py-1.5 rounded-button border border-border text-xs font-medium text-ink hover:border-river hover:text-river transition-all shrink-0"
        >
          {copiedLink ? t('linkCopied') : t('copyLink')}
        </button>
      </div>

      {/* Week-by-Week Pathway */}
      <div className="space-y-6">
        {itemsByWeek.map((week) => (
          <div key={week.weekNum} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-river bg-river/10 px-2.5 py-0.5 rounded-full">
                সপ্তাহ {locale === 'bn' ? toBanglaDigits(week.weekNum) : week.weekNum}
              </span>
              <span className="text-xs text-slate">
                {week.startDate} → {week.endDate}
              </span>
            </div>

            <div className="divide-y divide-mist rounded-sheet border border-border bg-surface overflow-hidden">
              {week.items.map((it) => {
                const isNext = nextItem?.id === it.id;
                const isDone = it.status === 'done';
                const isMissed = it.status === 'missed';
                const isSkipped = it.status === 'skipped';

                return (
                  <div
                    key={it.id}
                    className={`p-3 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                      isNext ? 'bg-river/5' : 'hover:bg-mist/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Knots adhering to design.md §6 */}
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isDone
                            ? 'bg-paddy text-paper'
                            : isNext
                            ? 'bg-marigold text-ink border-2 border-ink'
                            : isMissed
                            ? 'bg-brick/20 text-brick border border-brick'
                            : isSkipped
                            ? 'bg-mist text-slate'
                            : it.type === 'class'
                            ? 'bg-river/15 text-river'
                            : it.type === 'quiz'
                            ? 'bg-marigold/20 text-marigold'
                            : 'bg-paddy/20 text-paddy'
                        }`}
                      >
                        {isDone ? '✓' : isMissed ? '!' : isSkipped ? '/' : it.type === 'class' ? '●' : it.type === 'quiz' ? '◆' : '■'}
                      </span>

                      <div className="min-w-0">
                        <Link
                          href={`/class/${it.id}`}
                          className={`text-sm font-medium hover:underline block truncate ${
                            isDone ? 'text-slate line-through' : 'text-ink'
                          }`}
                        >
                          {it.label}
                        </Link>
                        <p className="text-xs text-slate font-mono mt-0.5">
                          {it.start_at.slice(0, 10)} • {it.start_at.slice(11, 16)}–{it.end_at.slice(11, 16)} ({it.duration_min}m)
                        </p>
                      </div>
                    </div>

                    {/* Quick status actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDone ? (
                        <span className="text-xs text-paddy font-semibold">সম্পন্ন</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleItemAction(it.id, 'complete')}
                            disabled={actionLoading === it.id}
                            className="p-1.5 rounded-input border border-border text-slate hover:text-paddy hover:border-paddy text-xs transition-colors"
                            title="সম্পন্ন করুন"
                            aria-label={`Mark done: ${it.label}`}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemAction(it.id, 'skip')}
                            disabled={actionLoading === it.id}
                            className="p-1.5 rounded-input border border-border text-slate hover:text-ink text-xs transition-colors"
                            title="বাদ দিন"
                            aria-label={`Skip: ${it.label}`}
                          >
                            —
                          </button>
                          <Link
                            href={`/class/${it.id}`}
                            className="px-2.5 py-1.5 rounded-button bg-river text-paper text-xs font-medium hover:bg-river/90 transition-colors"
                          >
                            পড়ুন →
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Replan Modal */}
      {showReplanModal && (
        <ReplanModal
          planId={plan.id}
          isOpen={showReplanModal}
          onClose={() => setShowReplanModal(false)}
          onSuccess={(newPlanId) => {
            setShowReplanModal(false);
            router.push(`/plans/${newPlanId}`);
          }}
        />
      )}
    </main>
  );
}
