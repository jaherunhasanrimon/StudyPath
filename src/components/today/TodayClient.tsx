'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { TodayResponse } from '@/modules/plans/types';
import { toBanglaDigits } from '@/modules/youtube/duration';
import { ReplanModal } from '@/components/replan/ReplanModal';

interface TodayClientProps {
  initialData: TodayResponse;
}

export function TodayClient({ initialData }: TodayClientProps) {
  const t = useTranslations('today');
  const locale = useLocale();
  const router = useRouter();

  const data = initialData;
  const [showReplanModal, setShowReplanModal] = useState(false);

  // If no plan is active
  if (!data.planId) {
    return (
      <main id="main-content" className="max-w-[720px] mx-auto px-4 py-8 space-y-6">
        <h1
          className="text-ink font-semibold text-3xl sm:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('title')}
        </h1>
        <div className="p-8 rounded-sheet border border-border bg-surface text-center space-y-4">
          <p className="text-base text-slate">{t('noPlan')}</p>
          <Link
            href="/new"
            className="inline-flex items-center justify-center px-6 py-3 rounded-button bg-river text-paper text-sm font-medium hover:bg-river/90 transition-colors shadow-2xs"
            style={{ minHeight: '44px' }}
          >
            {t('createPlan')} →
          </Link>
        </div>
      </main>
    );
  }

  const { primaryAction, overdue, upcoming, todayDate } = data;

  const handleReplanSuccess = (newPlanId: string) => {
    setShowReplanModal(false);
    router.push(`/plans/${newPlanId}`);
  };

  return (
    <main id="main-content" className="max-w-[720px] mx-auto px-4 py-8 space-y-8">
      {/* Today Heading */}
      <div className="border-b border-mist pb-4">
        <h1
          className="text-ink font-semibold text-3xl sm:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('title')}
        </h1>
        <p className="text-sm font-medium text-slate mt-1 font-mono">
          {todayDate} • {data.planName}
        </p>
      </div>

      {/* OVERDUE / MISSED BANNER */}
      {overdue.length > 0 && (
        <div className="p-4 rounded-sheet border border-brick/40 bg-brick/10 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brick text-paper text-xs font-bold flex items-center justify-center">
                !
              </span>
              <p className="text-sm font-semibold text-ink">
                {t('behind', {
                  count: locale === 'bn' ? toBanglaDigits(overdue.length) : overdue.length,
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowReplanModal(true)}
              className="text-xs font-bold text-river underline hover:text-river/80"
              style={{ minHeight: '36px' }}
            >
              {t('replanCta')}
            </button>
          </div>
          <div className="text-xs text-slate pl-7 flex items-center justify-between">
            <span>
              {t('catchUp', { classLabel: overdue[0].label })}
            </span>
            <Link
              href={`/class/${overdue[0].id}`}
              className="text-river font-medium hover:underline ml-2"
            >
              ক্লাস শুরু করুন →
            </Link>
          </div>
        </div>
      )}

      {/* PRIMARY ACTION: TODAY'S CURRENT ITEM */}
      {primaryAction ? (
        <div className="p-6 rounded-sheet border-2 border-river/30 bg-surface shadow-xs space-y-4 relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Marigold Knot (only place marigold appears per design.md) */}
              <span
                aria-hidden="true"
                className="w-5 h-5 rounded-full bg-marigold border-2 border-ink flex items-center justify-center shrink-0 shadow-2xs"
              />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-river">
                  {primaryAction.type === 'class'
                    ? 'ক্লাস'
                    : primaryAction.type === 'quiz'
                    ? 'কুইজ'
                    : 'অ্যাসাইনমেন্ট'}
                </span>
                <h2
                  className="text-xl sm:text-2xl font-semibold text-ink mt-0.5"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {primaryAction.label}
                </h2>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate font-mono pl-8">
            {primaryAction.duration_min} min • {primaryAction.start_at.slice(11, 16)}–{primaryAction.end_at.slice(11, 16)}
          </p>

          <div className="pt-2 pl-8">
            <Link
              href={`/class/${primaryAction.id}`}
              className="inline-flex items-center justify-center px-6 py-3 rounded-button bg-river text-paper text-sm font-semibold hover:bg-river/90 transition-colors shadow-2xs gap-2"
              style={{ minHeight: '44px' }}
            >
              <span>▶</span>
              <span>{t('startClass')}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-sheet border border-border bg-surface text-center space-y-2">
          <p className="text-base font-semibold text-paddy">✓ {t('completedAll')}</p>
          <p className="text-xs text-slate">
            {upcoming.length > 0
              ? t('empty', { nextClass: `${upcoming[0].label} (${upcoming[0].start_at.slice(0, 10)})` })
              : 'সব পড়া সম্পন্ন হয়েছে!'}
          </p>
        </div>
      )}

      {/* NEXT 3 UPCOMING ITEMS */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate">
            {t('upcoming')}
          </h3>
          <div className="divide-y divide-mist rounded-sheet border border-border bg-surface overflow-hidden">
            {upcoming.map((item) => (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-mist/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Shape knot */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      item.type === 'class'
                        ? 'bg-river/15 text-river'
                        : item.type === 'quiz'
                        ? 'bg-marigold/20 text-marigold'
                        : 'bg-paddy/20 text-paddy'
                    }`}
                  >
                    {item.type === 'class' ? '●' : item.type === 'quiz' ? '◆' : '■'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{item.label}</p>
                    <p className="text-xs text-slate font-mono mt-0.5">
                      {item.start_at.slice(0, 10)} • {item.duration_min}m
                    </p>
                  </div>
                </div>

                <Link
                  href={`/class/${item.id}`}
                  className="px-3 py-1.5 rounded-button border border-border text-xs font-medium text-slate hover:text-ink hover:border-river transition-colors shrink-0"
                  style={{ minHeight: '36px' }}
                >
                  দেখুন →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pathway Link */}
      <div className="pt-4 flex justify-center">
        <Link
          href={`/plans/${data.planId}`}
          className="text-xs font-semibold text-river hover:underline flex items-center gap-1"
        >
          <span>সম্পূর্ণ রুটিন (Pathway) দেখুন</span>
          <span>→</span>
        </Link>
      </div>

      {/* Replan Modal */}
      {showReplanModal && (
        <ReplanModal
          planId={data.planId}
          isOpen={showReplanModal}
          onClose={() => setShowReplanModal(false)}
          onSuccess={handleReplanSuccess}
        />
      )}
    </main>
  );
}
