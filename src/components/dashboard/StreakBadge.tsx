'use client';

import React from 'react';
import { StreakResult } from '@/modules/learning/progress';

interface StreakBadgeProps {
  streak: StreakResult;
  labels: {
    streak: string;
    streakDesc: string;
  };
}

/**
 * Streak counter component (optional, off by default per design.md §1 & phases.md §1).
 * Calm, encouraging, strictly without guilt copy or leaderboard confetti.
 */
export function StreakBadge({ streak, labels }: StreakBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-card-foreground shadow-xs">
      <span className="text-sm">🔥</span>
      <span className="font-semibold">{streak.currentStreak} {labels.streak}</span>
      <span className="text-muted-foreground">({labels.streakDesc})</span>
    </div>
  );
}
