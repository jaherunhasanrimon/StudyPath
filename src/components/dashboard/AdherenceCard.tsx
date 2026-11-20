'use client';

import React from 'react';
import { AdherenceResult } from '@/modules/learning/progress';

interface AdherenceCardProps {
  adherence: AdherenceResult;
  labels: {
    title: string;
    description: string;
    classes: string;
  };
}

export function AdherenceCard({ adherence, labels }: AdherenceCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{labels.title}</h3>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {adherence.rate}%
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{adherence.rate}%</span>
        <span className="text-xs text-muted-foreground">
          ({adherence.completedCount} / {adherence.totalCount} {labels.classes})
        </span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
        {labels.description}
      </p>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, adherence.rate))}%` }}
        />
      </div>
    </div>
  );
}
