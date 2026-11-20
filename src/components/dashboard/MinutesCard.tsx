'use client';

import React from 'react';
import { WeeklyMinutesResult } from '@/modules/learning/progress';

interface MinutesCardProps {
  weeklyMinutes: WeeklyMinutesResult;
  labels: {
    title: string;
    thisWeek: string;
    lastWeek: string;
    minutes: string;
  };
}

export function MinutesCard({ weeklyMinutes, labels }: MinutesCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{labels.title}</h3>
        <span className="text-xs text-muted-foreground">
          {labels.lastWeek}: {weeklyMinutes.lastWeekMinutes} {labels.minutes}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{weeklyMinutes.thisWeekMinutes}</span>
        <span className="text-sm text-muted-foreground">{labels.minutes}</span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {labels.thisWeek} ({weeklyMinutes.percentOfTarget}% লক্ষ্যমাত্রা পূরণ)
      </p>

      {/* Progress bar vs weekly target */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, weeklyMinutes.percentOfTarget))}%` }}
        />
      </div>
    </div>
  );
}
