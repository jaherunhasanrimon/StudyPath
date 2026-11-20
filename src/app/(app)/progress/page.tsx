'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AdherenceResult,
  WeeklyMinutesResult,
  QuizScoreTrendResult,
  UpcomingWorkloadResult,
  PlanHealth,
  StreakResult,
} from '@/modules/learning/progress';
import { AdherenceCard } from '@/components/dashboard/AdherenceCard';
import { MinutesCard } from '@/components/dashboard/MinutesCard';
import { QuizTrendCard } from '@/components/dashboard/QuizTrendCard';
import { WorkloadCard } from '@/components/dashboard/WorkloadCard';
import { PlanHealthBanner } from '@/components/dashboard/PlanHealthBanner';
import { StreakBadge } from '@/components/dashboard/StreakBadge';

interface ProgressData {
  adherence: AdherenceResult;
  weeklyMinutes: WeeklyMinutesResult;
  quizTrend: QuizScoreTrendResult;
  upcomingWorkload: UpcomingWorkloadResult;
  planHealth: PlanHealth;
  streak: StreakResult;
  streakEnabled: boolean;
}

export default function ProgressPage() {
  const t = useTranslations();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetch('/api/progress');
        if (!res.ok) {
          throw new Error('Failed to load progress data');
        }
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error loading dashboard';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-36 animate-pulse rounded-xl bg-card border border-border" />
          <div className="h-36 animate-pulse rounded-xl bg-card border border-border" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 text-center">
        <p className="text-sm text-destructive">{error || 'অগ্রগতি লোড করা যায়নি'}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>

        {/* Optional streak badge (strictly off by default) */}
        {data.streakEnabled && (
          <div>
            <StreakBadge
              streak={data.streak}
              labels={{
                streak: t('dashboard.streak'),
                streakDesc: t('dashboard.streakDesc'),
              }}
            />
          </div>
        )}
      </div>

      {/* Plan Health Status Banner */}
      <PlanHealthBanner
        planHealth={data.planHealth}
        labels={{
          onTrack: t('dashboard.onTrack'),
          behind: t('dashboard.behind'),
          replanNow: t('dashboard.replanNow'),
        }}
      />

      {/* Primary Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <AdherenceCard
          adherence={data.adherence}
          labels={{
            title: t('dashboard.adherence'),
            description: t('dashboard.adherenceDesc'),
            classes: t('dashboard.classes'),
          }}
        />

        <MinutesCard
          weeklyMinutes={data.weeklyMinutes}
          labels={{
            title: t('dashboard.studyTime'),
            thisWeek: t('dashboard.thisWeek'),
            lastWeek: t('dashboard.lastWeek'),
            minutes: t('dashboard.minutes'),
          }}
        />

        <QuizTrendCard
          quizTrend={data.quizTrend}
          labels={{
            title: t('dashboard.quizTrend'),
            averageScore: t('dashboard.quizAvg'),
          }}
        />

        <WorkloadCard
          workload={data.upcomingWorkload}
          labels={{
            title: t('dashboard.workload'),
            description: t('dashboard.workloadDesc'),
            classes: t('dashboard.classes'),
            minutes: t('dashboard.minutes'),
          }}
        />
      </div>
    </main>
  );
}
