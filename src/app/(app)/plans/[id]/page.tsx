'use client';

import { useState, useEffect, use } from 'react';
import { PlanWithItems } from '@/modules/plans/types';
import { PathwayClient } from '@/components/pathway/PathwayClient';

interface PlanDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PlanDetailPage({ params }: PlanDetailPageProps) {
  const { id } = use(params);
  const [plan, setPlan] = useState<PlanWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/plans/${id}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.plan) setPlan(d.plan);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading || !plan) {
    return (
      <main id="main-content" className="max-w-[760px] mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-60 bg-mist/40 rounded-sheet animate-pulse" />
        <div className="h-64 bg-mist/20 rounded-sheet animate-pulse" />
      </main>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const calendarUrl = `${origin}/api/calendar/${plan.id}.ics?token=sample`;

  return <PathwayClient plan={plan} calendarUrl={calendarUrl} />;
}
