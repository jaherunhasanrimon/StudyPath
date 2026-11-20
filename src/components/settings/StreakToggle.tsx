'use client';

import React from 'react';

interface StreakToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  labels: {
    title: string;
    description: string;
  };
}

/**
 * Optional streak counter toggle (off by default per design.md §1 & phases.md §1).
 */
export function StreakToggle({ enabled, onChange, labels }: StreakToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      <div>
        <h4 className="text-base font-semibold">{labels.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{labels.description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
          enabled ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
