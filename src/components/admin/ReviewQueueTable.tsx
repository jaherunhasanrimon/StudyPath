'use client';

import { useState, useEffect } from 'react';
import { QuestionReviewItem } from '@/modules/admin/types';

interface ReviewQueueTableProps {
  initialQuestions?: QuestionReviewItem[];
}

export function ReviewQueueTable({ initialQuestions = [] }: ReviewQueueTableProps) {
  const [questions, setQuestions] = useState<QuestionReviewItem[]>(initialQuestions);
  const [editingItem, setEditingItem] = useState<QuestionReviewItem | null>(null);
  const [editStem, setEditStem] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/queue')
      .then((res) => res.json())
      .then((d) => {
        if (d.queue) setQuestions(d.queue);
      })
      .catch(() => {});
  }, []);

  const handleToggleHide = async (q: QuestionReviewItem) => {
    const newHiddenState = !q.is_hidden;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: newHiddenState }),
      });

      if (!res.ok) throw new Error('Failed to update question status');

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id ? { ...item, is_hidden: newHiddenState } : item
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (q: QuestionReviewItem) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifier_status: 'human_ok',
          is_hidden: false,
        }),
      });

      if (!res.ok) throw new Error('Failed to approve question');

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id
            ? { ...item, verifier_status: 'human_ok', is_hidden: false }
            : item
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/questions/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stem: editStem,
          explanation: editExplanation,
          verifier_status: 'human_ok',
        }),
      });

      if (!res.ok) throw new Error('Failed to save edited question');

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                stem: editStem,
                explanation: editExplanation,
                verifier_status: 'human_ok',
              }
            : item
        )
      );
      setEditingItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">
          পর্যালোচনা কিউ ({questions.length} টি প্রশ্ন)
        </h2>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-card border border-border p-8 text-center text-slate bg-surface">
          কোনো প্রশ্ন পর্যালোচনার অপেক্ষায় নেই।
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm text-ink border-collapse">
            <thead className="bg-mist/50 border-b border-border text-xs uppercase text-slate font-medium">
              <tr>
                <th className="p-3">প্রশ্ন (Stem)</th>
                <th className="p-3">ধরণ</th>
                <th className="p-3">রিপোর্ট</th>
                <th className="p-3">স্ট্যাটাস</th>
                <th className="p-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-mist/30">
                  <td className="p-3 max-w-xs sm:max-w-md truncate font-medium">
                    {q.stem}
                  </td>
                  <td className="p-3 text-xs text-slate uppercase">{q.type}</td>
                  <td className="p-3">
                    {q.report_count > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-crimson/10 text-crimson">
                        ⚠️ {q.report_count}
                      </span>
                    ) : (
                      <span className="text-xs text-slate">0</span>
                    )}
                  </td>
                  <td className="p-3">
                    {q.is_hidden ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate/20 text-slate">
                        লুকানো (Hidden)
                      </span>
                    ) : q.verifier_status === 'human_ok' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                        যাচাইকৃত (Approved)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                        অযাচাইকৃত
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleToggleHide(q)}
                      disabled={isSubmitting}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        q.is_hidden
                          ? 'border-border text-ink hover:bg-mist'
                          : 'border-crimson/30 text-crimson hover:bg-crimson/10'
                      }`}
                    >
                      {q.is_hidden ? 'উন্মুক্ত করুন' : 'লুকিয়ে দিন'}
                    </button>
                    <button
                      onClick={() => handleApprove(q)}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-teal-700 text-white hover:bg-teal-800 transition-colors"
                    >
                      অনুমোদন
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(q);
                        setEditStem(q.stem);
                        setEditExplanation(q.explanation || '');
                      }}
                      className="px-2.5 py-1 rounded text-xs font-medium border border-border text-ink hover:bg-mist transition-colors"
                    >
                      সম্পাদনা
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-card bg-surface border border-border shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-ink">প্রশ্ন সম্পাদনা করুন</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate mb-1">
                  প্রশ্নের মূল টেক্সট (Stem)
                </label>
                <textarea
                  rows={3}
                  required
                  value={editStem}
                  onChange={(e) => setEditStem(e.target.value)}
                  className="w-full rounded-input border border-border bg-paper p-3 text-sm text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate mb-1">
                  ব্যাখ্যা (Explanation)
                </label>
                <textarea
                  rows={3}
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  className="w-full rounded-input border border-border bg-paper p-3 text-sm text-ink"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-button border border-border text-sm font-medium text-ink hover:bg-mist"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-button bg-river text-paper text-sm font-medium hover:bg-river/90"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
