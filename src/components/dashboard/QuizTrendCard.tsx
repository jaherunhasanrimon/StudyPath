'use client';

import React from 'react';
import { QuizScoreTrendResult } from '@/modules/learning/progress';

interface QuizTrendCardProps {
  quizTrend: QuizScoreTrendResult;
  labels: {
    title: string;
    averageScore: string;
  };
}

export function QuizTrendCard({ quizTrend, labels }: QuizTrendCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{labels.title}</h3>
        <span className="text-xs font-semibold text-primary">
          {labels.averageScore}: {quizTrend.averageScore}%
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{quizTrend.averageScore}%</span>
        <span className="text-xs text-muted-foreground">({quizTrend.totalAttempts}টি মূল্যায়ন)</span>
      </div>

      {quizTrend.recentScores.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">এখনও কোনো কুইজ সম্পন্ন হয়নি।</p>
      ) : (
        <div className="mt-4 space-y-2">
          {quizTrend.recentScores.slice(-5).map((score, idx) => (
            <div key={idx} className="flex items-center gap-3 text-xs">
              <span className="w-20 text-muted-foreground truncate">{score.date}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, score.percentage))}%` }}
                />
              </div>
              <span className="w-10 text-right font-medium">{score.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
