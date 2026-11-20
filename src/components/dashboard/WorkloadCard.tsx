'use client';

import React from 'react';
import { UpcomingWorkloadResult } from '@/modules/learning/progress';

interface WorkloadCardProps {
  workload: UpcomingWorkloadResult;
  labels: {
    title: string;
    description: string;
    classes: string;
    minutes: string;
  };
}

export function WorkloadCard({ workload, labels }: WorkloadCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{labels.title}</h3>
        <span className="text-xs text-muted-foreground">
          {workload.next7DaysMinutes} {labels.minutes}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{workload.next7DaysCount}</span>
        <span className="text-sm text-muted-foreground">{labels.classes}</span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{labels.description}</p>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {workload.byDay.map((day, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center justify-center rounded-md p-1.5 text-center transition-colors ${
              day.classCount > 0 ? 'bg-primary/10 text-primary font-medium' : 'bg-muted/40 text-muted-foreground'
            }`}
          >
            <span className="text-[10px]">{day.date.slice(8)}</span>
            <span className="text-xs font-semibold">{day.classCount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
