'use client';

import React, { useState, useEffect } from 'react';
import { KaTeXMath } from './KaTeXMath';
import { StudentAssessment, StudentQuestion, GradeResult } from '@/modules/ai/service';

interface QuizRunnerProps {
  assessment: StudentAssessment;
  attemptId: string;
  locale?: string;
  classItemId?: string;
  onComplete: (result: GradeResult) => void;
}

export function QuizRunner({
  assessment,
  attemptId,
  locale = 'bn',
  classItemId,
  onComplete,
}: QuizRunnerProps) {
  const isBn = locale === 'bn';
  const questions = assessment.questions;
  const total = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<
      string,
      {
        selectedIndex?: number;
        value?: number | string | boolean;
        hintsUsed: number;
        startTime: number;
        elapsedMs: number;
      }
    >
  >({});
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('confusing_stem');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Initialize start time for questions
  useEffect(() => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setAnswers((prev) => {
      if (prev[currentQ.id]) return prev;
      return {
        ...prev,
        [currentQ.id]: {
          hintsUsed: 0,
          startTime: Date.now(),
          elapsedMs: 0,
        },
      };
    });
  }, [currentIndex, questions]);

  const currentQ: StudentQuestion | undefined = questions[currentIndex];
  if (!currentQ) return null;

  const currentAns = answers[currentQ.id] || { hintsUsed: 0, startTime: Date.now(), elapsedMs: 0 };
  const currentHintIndex = revealedHints[currentQ.id] || 0;

  const handleSelectOption = (idx: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        selectedIndex: idx,
        elapsedMs: (prev[currentQ.id]?.elapsedMs || 0) + (Date.now() - (prev[currentQ.id]?.startTime || Date.now())),
        startTime: Date.now(),
      },
    }));
  };

  const handleValueChange = (val: string | number | boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        value: val,
        elapsedMs: (prev[currentQ.id]?.elapsedMs || 0) + (Date.now() - (prev[currentQ.id]?.startTime || Date.now())),
        startTime: Date.now(),
      },
    }));
  };

  const handleRevealNextHint = () => {
    if (currentQ.hints && currentHintIndex < currentQ.hints.length) {
      const nextCount = currentHintIndex + 1;
      setRevealedHints((prev) => ({ ...prev, [currentQ.id]: nextCount }));
      setAnswers((prev) => ({
        ...prev,
        [currentQ.id]: {
          ...prev[currentQ.id],
          hintsUsed: nextCount,
        },
      }));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formattedAnswers = questions.map((q) => {
        const recorded = answers[q.id];
        return {
          questionId: q.id,
          response: {
            selectedIndex: recorded?.selectedIndex,
            value: recorded?.value,
          },
          timeMs: recorded?.elapsedMs || 1000,
          hintsUsed: recorded?.hintsUsed || 0,
        };
      });

      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      if (!res.ok) {
        throw new Error('Failed to grade quiz.');
      }

      const data: GradeResult = await res.json();
      onComplete(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReport = async () => {
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQ.id,
          planItemId: classItemId,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      setReportSubmitted(true);
      setTimeout(() => {
        setReportSubmitted(false);
        setReportModalOpen(false);
        setReportDetails('');
      }, 1500);
    } catch {
      alert('Report submission failed.');
    }
  };

  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k]?.selectedIndex !== undefined || answers[k]?.value !== undefined
  ).length;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Top Header & Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-slate">
          <span>
            {isBn ? `প্রশ্ন ${currentIndex + 1} / ${total}` : `Question ${currentIndex + 1} of ${total}`}
          </span>
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="text-xs text-slate hover:text-brick transition-colors"
          >
            {isBn ? '⚠️ ভুল বা সমস্যা জানান' : '⚠️ Report issue'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-border rounded-full h-2 overflow-hidden">
          <div
            className="bg-river h-2 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-surface rounded-2xl p-6 border border-border space-y-6">
        {/* Topic Tag */}
        {currentQ.topic && (
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded bg-river/10 text-river border border-river/20">
            {currentQ.topic}
          </span>
        )}

        {/* Stem */}
        <div className="text-base sm:text-lg font-medium text-ink leading-relaxed">
          <KaTeXMath text={currentQ.stem} />
        </div>

        {/* Options / Inputs */}
        <div className="space-y-3 pt-2">
          {currentQ.type === 'mcq' && (
            <div className="space-y-2">
              {currentQ.options.map((opt, oIdx) => {
                const isSelected = currentAns.selectedIndex === oIdx;
                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelectOption(oIdx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 min-h-[44px] ${
                      isSelected
                        ? 'border-river bg-river/10 text-river font-medium shadow-sm'
                        : 'border-border bg-paper hover:bg-surface text-ink'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 mt-0.5 border ${
                        isSelected
                          ? 'bg-river text-white border-river'
                          : 'border-border text-slate'
                      }`}
                    >
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span className="leading-snug">
                      <KaTeXMath text={opt} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {currentQ.type === 'numeric' && (
            <div className="space-y-3">
              <input
                type="number"
                step="any"
                placeholder={isBn ? 'সংখ্যায় উত্তর লিখুন...' : 'Enter numeric value...'}
                value={currentAns.value !== undefined ? String(currentAns.value) : ''}
                onChange={(e) => handleValueChange(Number(e.target.value))}
                className="w-full p-4 rounded-xl border border-border bg-paper text-ink font-mono text-lg focus:outline-none focus:border-river"
              />
              {/* Quick Math Toolbar */}
              <div className="flex items-center gap-2 text-xs text-slate">
                <span>{isBn ? 'সহায়ক চিহ্ন:' : 'Symbols:'}</span>
                {['π', '√', '^', '/'].map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      if (sym === 'π') handleValueChange(3.14159);
                    }}
                    className="px-2 py-1 rounded bg-surface border border-border hover:bg-paper"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentQ.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleValueChange(true)}
                className={`py-4 rounded-xl border text-center font-medium min-h-[44px] ${
                  currentAns.value === true
                    ? 'border-paddy bg-paddy/10 text-paddy'
                    : 'border-border bg-paper hover:bg-surface text-ink'
                }`}
              >
                {isBn ? 'সত্য (True)' : 'True'}
              </button>
              <button
                type="button"
                onClick={() => handleValueChange(false)}
                className={`py-4 rounded-xl border text-center font-medium min-h-[44px] ${
                  currentAns.value === false
                    ? 'border-brick bg-brick/10 text-brick'
                    : 'border-border bg-paper hover:bg-surface text-ink'
                }`}
              >
                {isBn ? 'মিথ্যা (False)' : 'False'}
              </button>
            </div>
          )}

          {currentQ.type === 'short' && (
            <input
              type="text"
              placeholder={isBn ? 'উত্তর লিখুন...' : 'Enter your answer...'}
              value={currentAns.value !== undefined ? String(currentAns.value) : ''}
              onChange={(e) => handleValueChange(e.target.value)}
              className="w-full p-4 rounded-xl border border-border bg-paper text-ink text-base focus:outline-none focus:border-river"
            />
          )}
        </div>

        {/* Hint Ladder */}
        {currentQ.hints && currentQ.hints.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate">
                💡 {isBn ? `ইঙ্গিত (${currentHintIndex}/${currentQ.hints.length})` : `Hints (${currentHintIndex}/${currentQ.hints.length})`}
              </span>
              {currentHintIndex < currentQ.hints.length && (
                <button
                  type="button"
                  onClick={handleRevealNextHint}
                  className="text-xs text-river hover:underline"
                >
                  {isBn ? 'পরবর্তী ইঙ্গিত দেখুন' : 'Reveal next hint'}
                </button>
              )}
            </div>

            {currentHintIndex > 0 && (
              <div className="mt-2 space-y-1.5">
                {currentQ.hints.slice(0, currentHintIndex).map((h, hIdx) => (
                  <div
                    key={hIdx}
                    className="text-xs p-2.5 rounded bg-marigold/10 border border-marigold/20 text-ink leading-relaxed"
                  >
                    <strong>{isBn ? `ইঙ্গিত ${hIdx + 1}: ` : `Hint ${hIdx + 1}: `}</strong>
                    <KaTeXMath text={h} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => prev - 1)}
          className="px-5 py-3 rounded-xl border border-border text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface"
        >
          {isBn ? 'আগের প্রশ্ন' : 'Previous'}
        </button>

        {currentIndex < total - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            className="px-6 py-3 rounded-xl bg-river text-white text-sm font-medium hover:bg-river/90"
          >
            {isBn ? 'পরের প্রশ্ন' : 'Next'}
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-6 py-3 rounded-xl bg-paddy text-white text-sm font-semibold hover:bg-paddy/90 disabled:opacity-50"
          >
            {isSubmitting
              ? isBn
                ? 'জমা দেওয়া হচ্ছে...'
                : 'Submitting...'
              : isBn
                ? `কুইজ জমা দিন (${answeredCount}/${total})`
                : `Submit Quiz (${answeredCount}/${total})`}
          </button>
        )}
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h4 className="font-display font-semibold text-lg text-ink">
              {isBn ? 'ভুল বা অসঙ্গতি জানান' : 'Report an Issue'}
            </h4>
            {reportSubmitted ? (
              <div className="text-paddy text-center py-4 font-medium">
                {isBn ? 'আপনার মতামতের জন্য ধন্যবাদ!' : 'Thank you for your report!'}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate">
                    {isBn ? 'সমস্যার ধরন' : 'Reason'}
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-border bg-paper text-ink text-sm"
                  >
                    <option value="confusing_stem">{isBn ? 'প্রশ্নটি অস্পষ্ট বা বিভ্রান্তিকর' : 'Confusing question'}</option>
                    <option value="incorrect_answer">{isBn ? 'সঠিক উত্তর ভুল রয়েছে' : 'Incorrect answer key'}</option>
                    <option value="wrong_timestamp">{isBn ? 'ভিডিও টাইমস্ট্যাম্প ভুল' : 'Wrong video timestamp'}</option>
                    <option value="broken_formatting">{isBn ? 'ফর্মুলা বা লেখা ভেঙে গেছে' : 'Broken formatting'}</option>
                    <option value="other">{isBn ? 'অন্যান্য' : 'Other'}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate">
                    {isBn ? 'বিস্তারিত (ঐচ্ছিক)' : 'Details (optional)'}
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder={isBn ? 'কোন বিষয়টি ঠিক নেই...' : 'Describe the issue...'}
                    className="w-full p-2.5 rounded-lg border border-border bg-paper text-ink text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border text-xs text-slate hover:text-ink"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReport}
                    className="px-4 py-2 rounded-lg bg-brick text-white text-xs font-semibold hover:bg-brick/90"
                  >
                    {isBn ? 'রিপোর্ট পাঠান' : 'Submit Report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
