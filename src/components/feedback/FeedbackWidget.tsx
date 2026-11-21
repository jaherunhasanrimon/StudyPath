'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

export function FeedbackWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<'bug' | 'question_error' | 'suggestion' | 'praise'>('suggestion');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          metadata: {
            path: pathname,
            viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
            submittedAt: new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setStatus('success');
      setTimeout(() => {
        setIsOpen(false);
        setMessage('');
        setStatus('idle');
      }, 1800);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Error submitting');
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          aria-label="মতামত বা রিপোর্ট দিন (Give feedback)"
          className="flex items-center gap-2 rounded-full bg-surface border border-border shadow-lg px-4 py-2.5 text-sm font-medium text-ink transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-river"
          style={{ minHeight: '44px' }}
        >
          <span className="text-base" aria-hidden="true">💬</span>
          <span className="hidden sm:inline">মতামত দিন</span>
        </button>
      </div>

      {/* Feedback Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative w-full max-w-md rounded-card bg-surface border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="feedback-dialog-title" className="text-lg font-semibold text-ink">
                মতামত বা রিপোর্ট (Feedback)
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="বন্ধ করুন"
                className="rounded-full p-1.5 text-slate hover:bg-mist transition-colors"
              >
                ✕
              </button>
            </div>

            {status === 'success' ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-3xl">✓</p>
                <p className="text-base font-medium text-teal-700 dark:text-teal-300">
                  ধন্যবাদ! আপনার মতামত সফলভাবে পৌঁছেছে।
                </p>
                <p className="text-xs text-slate">আমরা দ্রুত এটি পর্যালোচনা করব।</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {status === 'error' && (
                  <div className="p-3 rounded-button bg-crimson/10 border border-crimson/20 text-crimson text-xs">
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label htmlFor="feedback-category" className="block text-xs font-medium text-slate mb-1">
                    ক্যাটেগরি বেছে নিন
                  </label>
                  <select
                    id="feedback-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                    className="w-full rounded-input border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-river focus:ring-0"
                  >
                    <option value="suggestion">💡 নতুন পরামর্শ (Suggestion)</option>
                    <option value="question_error">⚠️ প্রশ্নে ভুল বা অস্পষ্টতা (Question Error)</option>
                    <option value="bug">🐛 সিস্টেমে সমস্যা / বাগ (Bug Report)</option>
                    <option value="praise">❤️ প্রশংসা বা ভালোলাগা (Praise)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="feedback-message" className="block text-xs font-medium text-slate mb-1">
                    আপনার বার্তা <span className="text-crimson">*</span>
                  </label>
                  <textarea
                    id="feedback-message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="কোথায় কী সমস্যা হয়েছে বা আপনার অভিজ্ঞতা কেমন..."
                    className="w-full rounded-input border border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate focus:border-river focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-button border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-mist"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'submitting' || !message.trim()}
                    className="rounded-button bg-river px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-river/90 disabled:opacity-50"
                  >
                    {status === 'submitting' ? 'পাঠানো হচ্ছে...' : 'পাঠিয়ে দিন'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
