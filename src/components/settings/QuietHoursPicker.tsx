'use client';

import React from 'react';

interface QuietHoursPickerProps {
  start: string;
  end: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
  labels: {
    title: string;
    description: string;
    from: string;
    to: string;
  };
}

export function QuietHoursPicker({
  start,
  end,
  onStartChange,
  onEndChange,
  labels,
}: QuietHoursPickerProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      <h4 className="text-base font-semibold">{labels.title}</h4>
      <p className="text-xs text-muted-foreground mt-0.5">{labels.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="quiet-start" className="text-xs font-medium text-muted-foreground">
            {labels.from}:
          </label>
          <input
            id="quiet-start"
            type="time"
            value={start}
            onChange={(e) => onStartChange(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[44px] text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="quiet-end" className="text-xs font-medium text-muted-foreground">
            {labels.to}:
          </label>
          <input
            id="quiet-end"
            type="time"
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[44px] text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
}
