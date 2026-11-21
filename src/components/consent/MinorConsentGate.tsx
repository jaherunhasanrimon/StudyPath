'use client';

import React, { useState } from 'react';

interface MinorConsentGateProps {
  featureName?: string;
  initialGuardianEmail?: string;
  onConsentRequested?: () => void;
}

export function MinorConsentGate({
  featureName = 'এআই কুইজ ও অনুশীলন (AI Practice)',
  initialGuardianEmail = '',
  onConsentRequested,
}: MinorConsentGateProps) {
  const [guardianEmail, setGuardianEmail] = useState(initialGuardianEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianEmail || !guardianEmail.includes('@')) {
      setError('দয়া করে সঠিক অভিভাবক ইমেইল ঠিকানা দিন');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/consent/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardian_email: guardianEmail }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error?.message || 'অনুরোধ পাঠাতে সমস্যা হয়েছে');
      }

      setSent(true);
      onConsentRequested?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-6 sm:p-8 max-w-lg mx-auto text-slate-100 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🛡️</span>
        <div>
          <h3 className="text-lg font-bold text-slate-100">অভিভাবকের সম্মতি প্রয়োজন</h3>
          <p className="text-xs text-slate-400">Guardian Consent Required (PDPA 2026)</p>
        </div>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-4">
        বাংলাদেশ ডেটা সুরক্ষা আইন ২০২৬ এবং শিক্ষার্থীদের সুরক্ষা নীতির অংশ হিসেবে ১৮ বছরের কম বয়সী শিক্ষার্থীদের অ্যাকাউন্টে{' '}
        <strong className="text-teal-300">{featureName}</strong> সক্রিয় করার জন্য অভিভাবকের অনুমোদন প্রয়োজন।
      </p>

      {sent ? (
        <div className="p-4 bg-teal-950/70 border border-teal-700 rounded-lg text-teal-200 text-sm">
          <p className="font-semibold mb-1">✅ অনুমোদনের লিংক পাঠানো হয়েছে!</p>
          <p className="text-xs text-teal-300/90 leading-relaxed">
            <strong>{guardianEmail}</strong> ঠিকানায় একটি যাচাইকরণ ইমেইল পাঠানো হয়েছে। আপনার অভিভাবক লিংকে ক্লিক করে অনুমোদন করলেই ফিচারটি সক্রিয় হবে।
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="guardian-email" className="block text-xs font-medium text-slate-300 mb-1.5">
              অভিভাবকের ইমেইল ঠিকানা (Guardian Email)
            </label>
            <input
              id="guardian-email"
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              placeholder="parent@example.com"
              required
              className="w-full min-h-[44px] px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded text-xs text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition flex items-center justify-center gap-2"
          >
            {loading ? 'অনুরোধ পাঠানো হচ্ছে...' : 'অভিভাবকের সম্মতি অনুরোধ পাঠান'}
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            কোনো ব্যক্তিগত তথ্য বাণিজ্যিক উদ্দেশ্যে ব্যবহার করা হয় না। বিস্তারিত জানতে আমাদের{' '}
            <a href="/privacy" className="underline hover:text-slate-200" target="_blank" rel="noreferrer">
              গোপনীয়তা নীতি
            </a>{' '}
            পড়ুন।
          </p>
        </form>
      )}
    </div>
  );
}
