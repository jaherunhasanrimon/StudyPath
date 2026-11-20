'use client';

import React from 'react';
import Link from 'next/link';
import { KaTeXMath } from './KaTeXMath';
import { GradeResult, StudentQuestion } from '@/modules/ai/service';

interface QuizResultsProps {
  gradeResult: GradeResult;
  questions: StudentQuestion[];
  locale?: string;
  classItemId?: string;
  onSeekVideo?: (seconds: number) => void;
}

export function QuizResults({
  gradeResult,
  questions,
  locale = 'bn',
  classItemId,
  onSeekVideo,
}: QuizResultsProps) {
  const isBn = locale === 'bn';
  const { percentage, passed, answers } = gradeResult;

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  const formatSec = (sec: number | null) => {
    if (sec === null || sec === undefined) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-6 px-4">
      {/* Score Summary Card */}
      <div
        className={`rounded-2xl p-6 text-center border ${
          passed
            ? 'bg-paddy/10 border-paddy/30 text-ink'
            : 'bg-brick/10 border-brick/30 text-ink'
        }`}
      >
        <div className="text-4xl font-display font-bold mb-2">
          {percentage}%
        </div>
        <div className="text-lg font-medium mb-3">
          {passed
            ? isBn
              ? 'চমৎকার! আপনি কুইজে উত্তীর্ণ হয়েছেন 🎉'
              : 'Well done! You passed the quiz 🎉'
            : isBn
              ? 'আরও অনুশীলনের সুযোগ রয়েছে 💪'
              : 'Keep practicing! Review the topics below 💪'}
        </div>
        <div className="text-sm text-slate">
          {isBn
            ? `মোট নম্বর: ${gradeResult.score} / ${gradeResult.maxScore}`
            : `Total Score: ${gradeResult.score} / ${gradeResult.maxScore}`}
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-river/10 text-river border border-river/20">
          <span>✨</span>
          <span>
            {isBn ? 'AI-দ্বারা প্রস্তুত ও যাচাইকৃত' : 'AI-generated, verified'}
          </span>
        </div>
      </div>

      {/* Question Breakdown List */}
      <div className="space-y-4">
        <h3 className="font-display font-semibold text-lg text-ink">
          {isBn ? 'প্রশ্নোত্তর পর্যালোচনা' : 'Question Review'}
        </h3>

        {questions.map((q, idx) => {
          const graded = answerMap.get(q.id);
          const isCorrect = graded?.isCorrect ?? false;

          return (
            <div
              key={q.id}
              className={`rounded-xl p-4 border transition-all ${
                isCorrect
                  ? 'border-paddy/30 bg-surface/50'
                  : 'border-brick/30 bg-surface/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      isCorrect ? 'bg-paddy text-white' : 'bg-brick text-white'
                    }`}
                  >
                    {isCorrect ? '✓' : '✗'}
                  </span>
                  <span className="text-sm font-semibold text-slate">
                    {isBn ? `প্রশ্ন ${idx + 1}` : `Question ${idx + 1}`}
                  </span>
                </div>

                {graded?.timestampSec !== null && graded?.timestampSec !== undefined && (
                  <button
                    type="button"
                    onClick={() => onSeekVideo?.(graded.timestampSec!)}
                    className="inline-flex items-center gap-1 text-xs text-river hover:underline bg-river/10 px-2 py-1 rounded"
                    title={isBn ? 'ভিডিওতে এই অংশটি দেখুন' : 'Watch video at this timestamp'}
                  >
                    <span>▶</span>
                    <span>
                      {isBn ? 'ভিডিওতে দেখুন' : 'Review at'}{' '}
                      {formatSec(graded.timestampSec)}
                    </span>
                  </button>
                )}
              </div>

              {/* Question Stem */}
              <div className="text-sm font-medium text-ink mb-3 leading-relaxed">
                <KaTeXMath text={q.stem} />
              </div>

              {/* Explanation */}
              {graded?.explanation && (
                <div className="mt-3 text-xs bg-paper/80 p-3 rounded-lg border border-border text-slate leading-normal">
                  <strong className="text-ink block mb-1">
                    {isBn ? 'ব্যাখ্যা:' : 'Explanation:'}
                  </strong>
                  <KaTeXMath text={graded.explanation} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        {classItemId && (
          <Link
            href={`/class/${classItemId}`}
            className="flex-1 text-center py-3 px-4 rounded-xl font-medium bg-river text-white hover:bg-river/90 transition-colors"
          >
            {isBn ? 'ক্লাসে ফিরে যান' : 'Back to Class'}
          </Link>
        )}
        <Link
          href="/today"
          className="flex-1 text-center py-3 px-4 rounded-xl font-medium border border-border bg-surface hover:bg-paper transition-colors text-ink"
        >
          {isBn ? 'পাথওয়ে দেখুন' : 'Back to Pathway'}
        </Link>
      </div>
    </div>
  );
}
