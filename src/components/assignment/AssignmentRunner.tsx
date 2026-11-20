'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KaTeXMath } from '@/components/quiz/KaTeXMath';
import { StudentAssessment, StudentQuestion, GradeResult } from '@/modules/ai/service';

interface AssignmentRunnerProps {
  assessment: StudentAssessment;
  attemptId: string;
  locale?: string;
  classItemId?: string;
  onComplete?: (result: GradeResult) => void;
}

export function AssignmentRunner({
  assessment,
  attemptId,
  locale = 'bn',
  classItemId,
  onComplete,
}: AssignmentRunnerProps) {
  const isBn = locale === 'bn';
  const questions = assessment.questions;

  // Track student work per question
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [rubricScores, setRubricScores] = useState<
    Record<
      string,
      {
        formula: boolean;
        steps: boolean;
        finalValue: boolean;
      }
    >
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<GradeResult | null>(null);

  const handleRevealNextHint = (qId: string, maxHints: number) => {
    setRevealedHints((prev) => {
      const current = prev[qId] || 0;
      if (current < maxHints) {
        return { ...prev, [qId]: current + 1 };
      }
      return prev;
    });
  };

  const toggleRevealSolution = (qId: string) => {
    setRevealedSolutions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleRubricChange = (
    qId: string,
    field: 'formula' | 'steps' | 'finalValue',
    checked: boolean
  ) => {
    setRubricScores((prev) => {
      const cur = prev[qId] || { formula: false, steps: false, finalValue: false };
      return {
        ...prev,
        [qId]: { ...cur, [field]: checked },
      };
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formattedAnswers = questions.map((q) => {
        const rubric = rubricScores[q.id] || { formula: false, steps: false, finalValue: false };
        let selfScore = 0;
        if (rubric.formula) selfScore += 3;
        if (rubric.steps) selfScore += 4;
        if (rubric.finalValue) selfScore += 3;

        return {
          questionId: q.id,
          response: {
            value: solutions[q.id] || '',
            selfScore,
          },
          timeMs: 60000,
          hintsUsed: revealedHints[q.id] || 0,
        };
      });

      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit assignment.');
      }

      const data: GradeResult = await res.json();
      setSubmissionResult(data);
      onComplete?.(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSec = (sec: number | null) => {
    if (sec === null || sec === undefined) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (submissionResult) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <div className="bg-paddy/10 border border-paddy/30 rounded-2xl p-6 text-center space-y-2">
          <div className="text-3xl font-display font-bold text-ink">
            {isBn ? 'অ্যাসাইনমেন্ট সম্পন্ন হয়েছে!' : 'Assignment Completed!'}
          </div>
          <div className="text-slate text-sm">
            {isBn
              ? `আত্ম-মূল্যায়ন স্কোর: ${submissionResult.score} / ${submissionResult.maxScore} (${submissionResult.percentage}%)`
              : `Self-Evaluation Score: ${submissionResult.score} / ${submissionResult.maxScore} (${submissionResult.percentage}%)`}
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-river/10 text-river border border-river/20">
              ✨ {isBn ? 'AI-দ্বারা প্রস্তুত ও যাচাইকৃত' : 'AI-generated, verified'}
            </span>
          </div>
        </div>

        <div className="flex gap-4">
          {classItemId && (
            <Link
              href={`/class/${classItemId}`}
              className="flex-1 py-3 px-4 rounded-xl font-medium bg-river text-white text-center hover:bg-river/90"
            >
              {isBn ? 'ক্লাসে ফিরে যান' : 'Back to Class'}
            </Link>
          )}
          <Link
            href="/today"
            className="flex-1 py-3 px-4 rounded-xl font-medium border border-border bg-surface text-ink text-center hover:bg-paper"
          >
            {isBn ? 'পাথওয়ে দেখুন' : 'Back to Pathway'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-river/10 text-river border border-river/20">
            {isBn ? 'অনুশীলনী অ্যাসাইনমেন্ট' : 'Practice Assignment'}
          </span>
          <span className="text-xs text-slate">
            {isBn ? `${questions.length}টি সমস্যা` : `${questions.length} Problems`}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-display font-bold text-ink">
          {isBn ? 'গাণিতিক ও বর্ণনামূলক সমস্যা সেট' : 'Problem Solving Set'}
        </h2>
        <p className="text-xs sm:text-sm text-slate">
          {isBn
            ? 'সমস্যাগুলো নিজে সমাধানের চেষ্টা করুন। প্রয়োজন অনুযায়ী ইঙ্গিত দেখুন এবং সমাধানের পর রুব্রিক অনুযায়ী স্ব-মূল্যায়ন করুন।'
            : 'Work through each problem. Use hints if stuck, then check the solution and self-evaluate against the rubric.'}
        </p>
      </div>

      {/* Questions list */}
      <div className="space-y-6">
        {questions.map((q: StudentQuestion, idx: number) => {
          const hintsCount = q.hints?.length || 0;
          const currentHintLevel = revealedHints[q.id] || 0;
          const isSolutionRevealed = revealedSolutions[q.id] || false;
          const rubric = rubricScores[q.id] || { formula: false, steps: false, finalValue: false };

          return (
            <div
              key={q.id}
              className="bg-surface rounded-2xl p-6 border border-border space-y-4"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                <span className="font-semibold text-sm text-ink">
                  {isBn ? `সমস্যা ${idx + 1}` : `Problem ${idx + 1}`}
                </span>
                {q.timestampSec !== null && (
                  <span className="text-xs text-slate bg-paper px-2 py-0.5 rounded border border-border">
                    {isBn ? 'ভিডিও প্রসঙ্গ:' : 'Video Context:'} {formatSec(q.timestampSec)}
                  </span>
                )}
              </div>

              {/* Stem */}
              <div className="text-base text-ink leading-relaxed">
                <KaTeXMath text={q.stem} />
              </div>

              {/* Solution Work Area */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-slate">
                  {isBn ? 'আপনার সমাধানের খসড়া / ধাপসমূহ:' : 'Your Working Steps / Notes:'}
                </label>
                <textarea
                  rows={4}
                  value={solutions[q.id] || ''}
                  onChange={(e) =>
                    setSolutions((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  placeholder={
                    isBn
                      ? 'এখানে আপনার সমাধান বা উত্তর লিখুন...'
                      : 'Type your solution or final answer here...'
                  }
                  className="w-full p-3 rounded-xl border border-border bg-paper text-ink text-sm focus:outline-none focus:border-river font-mono"
                />
              </div>

              {/* 3-Tier Progressive Hint Ladder */}
              {hintsCount > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate">
                      💡 {isBn ? `ইঙ্গিত মই (${currentHintLevel}/${hintsCount})` : `Hint Ladder (${currentHintLevel}/${hintsCount})`}
                    </span>
                    {currentHintLevel < hintsCount && (
                      <button
                        type="button"
                        onClick={() => handleRevealNextHint(q.id, hintsCount)}
                        className="text-xs text-river hover:underline"
                      >
                        {currentHintLevel === 0
                          ? isBn
                            ? '১ম ইঙ্গিত (ধারণা) দেখুন'
                            : 'Reveal Tier 1 Hint (Nudge)'
                          : currentHintLevel === 1
                            ? isBn
                              ? '২য় ইঙ্গিত (সূত্র) দেখুন'
                              : 'Reveal Tier 2 Hint (Formula)'
                            : isBn
                              ? '৩য় ইঙ্গিত (ধাপ) দেখুন'
                              : 'Reveal Tier 3 Hint (Steps)'}
                      </button>
                    )}
                  </div>

                  {currentHintLevel > 0 && (
                    <div className="space-y-2">
                      {q.hints.slice(0, currentHintLevel).map((hint: string, hIdx: number) => (
                        <div
                          key={hIdx}
                          className="p-3 rounded-lg bg-marigold/10 border border-marigold/20 text-xs text-ink leading-relaxed"
                        >
                          <strong className="block mb-0.5 text-ink">
                            {hIdx === 0
                              ? isBn
                                ? 'ইঙ্গিত ১ (ধারণা):'
                                : 'Hint 1 (Nudge):'
                              : hIdx === 1
                                ? isBn
                                  ? 'ইঙ্গিত ২ (সূত্র ও তত্ত্ব):'
                                  : 'Hint 2 (Formula):'
                                : isBn
                                  ? 'ইঙ্গিত ৩ (হিসাবের ধাপ):'
                                  : 'Hint 3 (Steps):'}
                          </strong>
                          <KaTeXMath text={hint} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reveal Solution & Rubric Checklist */}
              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => toggleRevealSolution(q.id)}
                  className="text-xs font-semibold text-river hover:underline"
                >
                  {isSolutionRevealed
                    ? isBn
                      ? '▲ সমাধান লুকান'
                      : '▲ Hide Solution'
                    : isBn
                      ? '▼ আদর্শ সমাধান ও আত্ম-মূল্যায়ন দেখুন'
                      : '▼ Check Worked Solution & Self-Evaluate'}
                </button>

                {isSolutionRevealed && (
                  <div className="mt-3 space-y-4 bg-paper/80 p-4 rounded-xl border border-border">
                    <div>
                      <div className="text-xs font-bold text-ink mb-1">
                        {isBn ? 'আদর্শ সমাধান / সূত্র প্রয়োগ:' : 'Worked Solution:'}
                      </div>
                      <div className="text-xs text-slate leading-relaxed">
                        <KaTeXMath
                          text={
                            q.hints[q.hints.length - 1] ||
                            'Apply primary lecture principles to verify intermediate steps.'
                          }
                        />
                      </div>
                    </div>

                    {/* Rubric Checklist */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <div className="text-xs font-bold text-ink">
                        {isBn ? 'রুব্রিক স্ব-মূল্যায়ন:' : 'Rubric Self-Check:'}
                      </div>
                      <div className="space-y-1.5 text-xs text-ink">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rubric.formula}
                            onChange={(e) =>
                              handleRubricChange(q.id, 'formula', e.target.checked)
                            }
                            className="rounded border-border text-river"
                          />
                          <span>
                            {isBn
                              ? 'আমি সঠিক সূত্র বা তত্ত্ব চিহ্নিত করেছি (+৩ নম্বর)'
                              : 'Identified the correct formula or principle (+3 pts)'}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rubric.steps}
                            onChange={(e) =>
                              handleRubricChange(q.id, 'steps', e.target.checked)
                            }
                            className="rounded border-border text-river"
                          />
                          <span>
                            {isBn
                              ? 'মধ্যবর্তী হিসাব ও ধাপগুলো সঠিক হয়েছে (+৪ নম্বর)'
                              : 'Intermediate steps and calculations are correct (+4 pts)'}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rubric.finalValue}
                            onChange={(e) =>
                              handleRubricChange(q.id, 'finalValue', e.target.checked)
                            }
                            className="rounded border-border text-river"
                          />
                          <span>
                            {isBn
                              ? 'চূড়ান্ত উত্তর ও একক সঠিক হয়েছে (+৩ নম্বর)'
                              : 'Final answer and unit are correct (+3 pts)'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Assignment */}
      <div className="pt-4 flex justify-end">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-river text-white font-semibold text-sm hover:bg-river/90 disabled:opacity-50"
        >
          {isSubmitting
            ? isBn
              ? 'জমা দেওয়া হচ্ছে...'
              : 'Submitting...'
            : isBn
              ? 'অ্যাসাইনমেন্ট সম্পন্ন করুন'
              : 'Complete Assignment'}
        </button>
      </div>
    </div>
  );
}
