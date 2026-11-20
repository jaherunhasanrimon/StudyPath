'use client';

import React from 'react';
import Link from 'next/link';
import { PlanHealth } from '@/modules/learning/progress';

interface PlanHealthBannerProps {
  planHealth: PlanHealth;
  labels: {
    onTrack: string;
    behind: string;
    replanNow: string;
  };
}

export function PlanHealthBanner({ planHealth, labels }: PlanHealthBannerProps) {
  const isOnTrack = planHealth === 'on_track';

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isOnTrack
          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100'
          : 'border-amber-500/20 bg-amber-500/5 text-amber-950 dark:text-amber-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{isOnTrack ? '🌱' : '⏳'}</span>
        <div>
          <h4 className="text-base font-semibold">
            {isOnTrack ? labels.onTrack : labels.behind}
          </h4>
          <p className="text-xs opacity-85 mt-0.5">
            {isOnTrack
              ? 'আপনার রুটিন অনুযায়ী পড়া চলছে। নিয়মিত পড়ার অভ্যাস বজায় রাখুন।'
              : 'ছুটি বা ব্যস্ততার কারণে কিছু পড়া জমে গেলে চিন্তা নেই, আপনার সময় অনুযায়ী শিডিউল সাজিয়ে নিন।'}
          </p>
        </div>
      </div>

      {!isOnTrack && (
        <Link
          href="/today"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors"
        >
          {labels.replanNow}
        </Link>
      )}
    </div>
  );
}
