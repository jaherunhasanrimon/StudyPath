'use client';

import React, { useState } from 'react';

interface GuardianConsentViewProps {
  token: string;
  initialStatus: 'pending' | 'granted' | 'revoked' | 'expired';
  guardianEmail: string;
  studentName?: string | null;
  expiresAt: string;
  isExpired?: boolean;
}

export function GuardianConsentView({
  token,
  initialStatus,
  guardianEmail,
  studentName,
  expiresAt,
  isExpired = false,
}: GuardianConsentViewProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecision = async (decision: 'grant' | 'revoke') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/consent/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decision }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error?.message || 'Failed to process decision');
      }
      setStatus(data.status);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const expired = isExpired || status === 'expired';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-xl p-6 sm:p-8 shadow-xl">
        <header className="mb-6 border-b border-slate-700 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-teal-400">দিশারি</span>
            <span className="text-xs bg-teal-950 text-teal-300 px-2 py-0.5 rounded border border-teal-800 font-medium">
              PDPA 2026 অভিভাবক সম্মতি
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
            শিক্ষার্থী অ্যাকাউন্টের অভিভাবক সম্মতি পর্যালোচনা
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Guardian Consent Review for Student Study Pathway
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-200 text-sm">
            {error}
          </div>
        )}

        {status === 'granted' && (
          <div className="p-6 bg-teal-950/60 border border-teal-700 rounded-lg text-center mb-6">
            <div className="text-3xl mb-2">✅</div>
            <h2 className="text-lg font-bold text-teal-200">সম্মতি প্রদান সম্পন্ন হয়েছে</h2>
            <p className="text-sm text-teal-300/90 mt-1">
              Consent has been granted. {studentName ? `${studentName}-এর` : 'The'} student account now has access to study reminders and AI practice.
            </p>
            <p className="text-xs text-slate-400 mt-4">
              আপনি যেকোনো সময় এই পৃষ্ঠায় এসে সম্মতি প্রত্যাহার করতে পারবেন।
            </p>
            <button
              onClick={() => handleDecision('revoke')}
              disabled={loading}
              className="mt-4 px-4 py-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-600 transition"
            >
              সম্মতি প্রত্যাহার করুন (Revoke Consent)
            </button>
          </div>
        )}

        {status === 'revoked' && (
          <div className="p-6 bg-rose-950/60 border border-rose-800 rounded-lg text-center mb-6">
            <div className="text-3xl mb-2">⚠️</div>
            <h2 className="text-lg font-bold text-rose-200">সম্মতি প্রত্যাহার করা হয়েছে</h2>
            <p className="text-sm text-rose-300/90 mt-1">
              Consent has been revoked. AI features and automated notifications remain disabled for this student.
            </p>
            <button
              onClick={() => handleDecision('grant')}
              disabled={loading}
              className="mt-4 px-4 py-2 text-xs bg-teal-600 hover:bg-teal-500 text-white rounded transition"
            >
              পুনরায় সম্মতি দিন (Grant Consent)
            </button>
          </div>
        )}

        {expired && status !== 'granted' && status !== 'revoked' && (
          <div className="p-6 bg-amber-950/60 border border-amber-800 rounded-lg text-center mb-6">
            <div className="text-3xl mb-2">⏳</div>
            <h2 className="text-lg font-bold text-amber-200">এই লিঙ্কটির মেয়াদ শেষ হয়ে গেছে</h2>
            <p className="text-sm text-amber-300/90 mt-1">
              This consent token has expired (valid for 7 days). The student may request a new link from their Dishari account.
            </p>
          </div>
        )}

        {status === 'pending' && !expired && (
          <div>
            <div className="bg-slate-700/50 p-4 rounded-lg mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">শিক্ষার্থীর নাম (Student):</span>
                <span className="font-medium text-slate-200">{studentName || 'Dishari Student'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">অভিভাবকের ইমেইল (Guardian Email):</span>
                <span className="font-medium text-slate-200">{guardianEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">মেয়াদ উত্তীর্ণের তারিখ (Expires):</span>
                <span className="font-medium text-slate-200">
                  {new Date(expiresAt).toLocaleDateString('bn-BD', { dateStyle: 'medium' })}
                </span>
              </div>
            </div>

            <section className="space-y-3 mb-6 text-sm text-slate-300 leading-relaxed">
              <h3 className="font-semibold text-slate-100 text-base">দিশারির সুরক্ষা প্রতিশ্রুতি:</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                <li>
                  <strong className="text-teal-300">বিজ্ঞাপন ও ট্র্যাকার মুক্ত:</strong> দিশারিতে কোনো বাণিজ্যিক বিজ্ঞাপন বা ট্র্যাকিং নেই।
                </li>
                <li>
                  <strong className="text-teal-300">ডেটা নিরাপত্তা:</strong> শিক্ষার্থীদের ব্যক্তিগত তথ্য কখনো বিক্রি বা প্রচার করা হয় না (বাংলাদেশ ডেটা সুরক্ষা আইন ২০২৬ অনুগত)।
                </li>
                <li>
                  <strong className="text-teal-300">এআই ও নোটিফিকেশন:</strong> সম্মতি অনুমোদিত হলে শিক্ষার্থী তার ক্লাসের রিমাইন্ডার এবং এআই কুইজ অনুশীলনের সুবিধা পাবেন।
                </li>
              </ul>
            </section>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => handleDecision('grant')}
                disabled={loading}
                className="flex-1 min-h-[44px] bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-medium rounded-lg px-6 py-2.5 transition flex items-center justify-center gap-2 shadow"
              >
                {loading ? 'প্রক্রিয়াধীন...' : 'সম্মতি প্রদান করুন (Grant Consent)'}
              </button>
              <button
                onClick={() => handleDecision('revoke')}
                disabled={loading}
                className="min-h-[44px] bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-300 font-medium rounded-lg px-5 py-2.5 border border-slate-600 transition"
              >
                অস্বীকৃতি জানান (Decline)
              </button>
            </div>
          </div>
        )}

        <footer className="mt-8 pt-4 border-t border-slate-700 text-center text-xs text-slate-400">
          Dishari — Study Pathway Platform for Bangladesh •{' '}
          <a href="/privacy" className="underline hover:text-slate-200" target="_blank" rel="noreferrer">
            গোপনীয়তা নীতি (Privacy)
          </a>
        </footer>
      </div>
    </div>
  );
}
