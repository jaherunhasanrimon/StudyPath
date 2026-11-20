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
  const t = useTranslations('dashboard');
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
      } catch (err: any) {
        setError(err.message || 'Error loading dashboard');
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Optional streak badge (strictly off by default) */}
        {data.streakEnabled && (
          <div>
            <StreakBadge
              streak={data.streak}
              labels={{
                streak: t('streak'),
                streakDesc: t('streakDesc'),
              }}
            />
          </div>
        )}
      </div>

      {/* Plan Health Status Banner */}
      <PlanHealthBanner
        planHealth={data.planHealth}
        labels={{
          onTrack: t('onTrack'),
          behind: t('behind'),
          replanNow: t('replanNow'),
        }}
      />

      {/* Primary Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <AdherenceCard
          adherence={data.adherence}
          labels={{
            title: t('adherence'),
            description: t('adherenceDesc'),
            classes: t('classes'),
          }}
        />

        <MinutesCard
          weeklyMinutes={data.weeklyMinutes}
          labels={{
            title: t('studyTime'),
            thisWeek: t('thisWeek'),
            lastWeek: t('lastWeek'),
            minutes: t('minutes'),
          }}
        />

        <QuizTrendCard
          quizTrend={data.quizTrend}
          labels={{
            title: t('quizTrend'),
            averageScore: t('quizAvg'),
          }}
        />

        <WorkloadCard
          workload={data.upcomingWorkload}
          labels={{
            title: t('workload'),
            description: t('workloadDesc'),
            classes: t('classes'),
            minutes: t('minutes'),
          }}
        />
      </div>
    </main>
  );
}
