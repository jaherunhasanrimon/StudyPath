'use client';

import { useState, useEffect } from 'react';
import { PilotCohortMetrics } from '@/modules/admin/types';

interface PilotDashboardViewProps {
  metrics: PilotCohortMetrics;
}

export function PilotDashboardView({ metrics: initialMetrics }: PilotDashboardViewProps) {
  const [metrics, setMetrics] = useState<PilotCohortMetrics>(initialMetrics);

  useEffect(() => {
    fetch('/api/admin/pilot-stats')
      .then((res) => res.json())
      .then((d) => {
        if (d.metrics) setMetrics(d.metrics);
      })
      .catch(() => {});
  }, []);
  return (
    <div className="space-y-8">
      {/* High-level stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-card border border-border bg-surface">
          <p className="text-xs uppercase tracking-wider text-slate font-semibold">মোট পাইলট শিক্ষার্থী</p>
          <p className="text-3xl font-display font-bold text-ink mt-2">{metrics.totalStudents}</p>
          <p className="text-xs text-slate mt-1">সক্রিয়: {metrics.activeStudents} জন</p>
        </div>

        <div className="p-5 rounded-card border border-border bg-surface">
          <p className="text-xs uppercase tracking-wider text-slate font-semibold">রুটিন সমাপ্তির হার (Adherence)</p>
          <p className="text-3xl font-display font-bold text-river mt-2">
            {metrics.overallAdherenceRate}%
          </p>
          <p className="text-xs text-slate mt-1">ক্লাস শেষ করার গড় হার</p>
        </div>

        <div className="p-5 rounded-card border border-border bg-surface">
          <p className="text-xs uppercase tracking-wider text-slate font-semibold">কুইজ অংশগ্রহণের হার</p>
          <p className="text-3xl font-display font-bold text-paddy mt-2">
            {metrics.quizAttemptRate}%
          </p>
          <p className="text-xs text-slate mt-1">ধার্যকৃত কুইজ সম্পন্ন</p>
        </div>

        <div className="p-5 rounded-card border border-border bg-surface">
          <p className="text-xs uppercase tracking-wider text-slate font-semibold">মোট এআই খরচ (USD)</p>
          <p className="text-3xl font-display font-bold text-ink mt-2">
            ${metrics.totalAiCostUsd.toFixed(3)}
          </p>
          <p className="text-xs text-slate mt-1">শিক্ষার্থী প্রতি: ${metrics.costPerActiveStudentUsd.toFixed(3)}</p>
        </div>
      </div>

      {/* Retention Cohort Curves */}
      <div className="rounded-card border border-border bg-surface p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">কোহোর্ট রিটেনশন কার্ভ (Retention Curves)</h3>
          <p className="text-xs text-slate">
            নিবন্ধন পরবর্তী সময়কালে শিক্ষার্থীদের অ্যাপে সক্রিয় থাকার পরিসংখ্যান (Week 1, Week 4, Week 8)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          {/* Week 1 */}
          <div className="border border-border/80 rounded-card p-4 space-y-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-ink">সপ্তাহ ১ (Week 1)</span>
              <span className="text-river font-bold">{metrics.retention.week1Rate}%</span>
            </div>
            <div className="w-full bg-mist rounded-full h-3 overflow-hidden">
              <div
                className="bg-river h-3 rounded-full transition-all duration-500"
                style={{ width: `${metrics.retention.week1Rate}%` }}
              />
            </div>
            <p className="text-xs text-slate">টার্গেট: {'>'} 80%</p>
          </div>

          {/* Week 4 */}
          <div className="border border-border/80 rounded-card p-4 space-y-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-ink">সপ্তাহ ৪ (Week 4)</span>
              <span className="text-river font-bold">{metrics.retention.week4Rate}%</span>
            </div>
            <div className="w-full bg-mist rounded-full h-3 overflow-hidden">
              <div
                className="bg-river h-3 rounded-full transition-all duration-500"
                style={{ width: `${metrics.retention.week4Rate}%` }}
              />
            </div>
            <p className="text-xs text-slate">টার্গেট: {'>'} 60%</p>
          </div>

          {/* Week 8 */}
          <div className="border border-border/80 rounded-card p-4 space-y-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-ink">সপ্তাহ ৮ (Week 8)</span>
              <span className="text-river font-bold">{metrics.retention.week8Rate}%</span>
            </div>
            <div className="w-full bg-mist rounded-full h-3 overflow-hidden">
              <div
                className="bg-river h-3 rounded-full transition-all duration-500"
                style={{ width: `${metrics.retention.week8Rate}%` }}
              />
            </div>
            <p className="text-xs text-slate">টার্গেট: {'>'} 40%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
