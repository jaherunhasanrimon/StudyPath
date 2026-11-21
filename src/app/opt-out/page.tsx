'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function CreatorOptOutPage() {
  const t = useTranslations();
  const [channelId, setChannelId] = useState('');
  const [channelTitle, setChannelTitle] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId.trim(),
          channel_title: channelTitle.trim(),
          contact_email: contactEmail.trim() || undefined,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit opt-out request');
      }

      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed');
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-paper py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-river hover:underline inline-flex items-center gap-1 mb-4"
          >
            ← {t('cta.home') || 'হোমপেজে ফিরুন'}
          </Link>
          <h1 className="text-3xl font-display font-semibold text-ink">
            কন্টেন্ট ক্রিয়েটর অপ্ট-আউট (Creator Opt-Out)
          </h1>
          <p className="mt-3 text-base text-slate leading-relaxed">
            দিশারী (Dishari) সর্বদা কনটেন্ট ক্রিয়েটরদের স্বত্ব ও ইচ্ছাকে সর্বোচ্চ সম্মান জানায়।
            আমরা ইউটিউবের কোনো ভিডিও ডাউনলোড বা সংরক্ষণ করি না, শুধুমাত্র অফিসিয়াল
            YouTube IFrame এম্বেড প্লেয়ারের মাধ্যমে শিক্ষার্থীদের পড়তে সহায়তা করি।
          </p>
          <p className="mt-2 text-sm text-slate leading-relaxed">
            আপনি যদি চান যে দিশারীতে আপনার চ্যানেলের ভিডিওগুলো থেকে কোনো এআই সামারি বা প্রশ্ন তৈরি না হোক,
            তবে নিচের ফর্মে আপনার চ্যানেল আইডি সাবমিট করুন। আমরা অবিলম্বে আপনার চ্যানেলের সব শেয়ার্ড ইনসাইট
            মুছে ফেলব।
          </p>
        </div>

        {status === 'success' ? (
          <div className="rounded-card border border-teal-200 bg-teal-50 dark:bg-teal-950/30 p-6 space-y-3">
            <h2 className="text-lg font-medium text-teal-900 dark:text-teal-100">
              ✓ আপনার অনুরোধ সফলভাবে গৃহীত হয়েছে
            </h2>
            <p className="text-sm text-teal-800 dark:text-teal-200">
              আপনার চ্যানেলের অপ্ট-আউট রেকর্ড করা হয়েছে এবং শেয়ার্ড ইনসাইট মুছে ফেলা হয়েছে।
              প্রয়োজনে আমাদের সাথে যোগাযোগ করতে পারেন: support@dishari.app
            </p>
            <Link
              href="/"
              className="inline-block mt-2 text-sm font-semibold text-river underline"
            >
              মূল পাতায় ফিরুন
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 bg-surface p-6 sm:p-8 rounded-card border border-border">
            {status === 'error' && (
              <div className="p-4 rounded-button bg-crimson/10 border border-crimson/20 text-crimson text-sm">
                {errorMessage}
              </div>
            )}

            <div>
              <label htmlFor="channelId" className="block text-sm font-medium text-ink">
                ইউটিউব চ্যানেল আইডি (Channel ID) <span className="text-crimson">*</span>
              </label>
              <input
                id="channelId"
                type="text"
                required
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="যেমন: UC_x5XG1OV2P6uZZ5FSM9Ttw"
                className="mt-1 block w-full rounded-input border border-border bg-paper px-4 py-3 text-ink placeholder:text-slate focus:border-river focus:ring-0"
              />
              <p className="mt-1 text-xs text-slate">
                আপনার চ্যানেলের About পেজ বা URL থেকে Channel ID টি কপি করুন।
              </p>
            </div>

            <div>
              <label htmlFor="channelTitle" className="block text-sm font-medium text-ink">
                চ্যানেলের নাম (Channel Name) <span className="text-crimson">*</span>
              </label>
              <input
                id="channelTitle"
                type="text"
                required
                value={channelTitle}
                onChange={(e) => setChannelTitle(e.target.value)}
                placeholder="যেমন: 10 Minute School"
                className="mt-1 block w-full rounded-input border border-border bg-paper px-4 py-3 text-ink placeholder:text-slate focus:border-river focus:ring-0"
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-ink">
                যোগাযোগের ইমেইল (Contact Email)
              </label>
              <input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="creator@example.com"
                className="mt-1 block w-full rounded-input border border-border bg-paper px-4 py-3 text-ink placeholder:text-slate focus:border-river focus:ring-0"
              />
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-ink">
                মন্তব্য বা কারণ (ঐচ্ছিক)
              </label>
              <textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="কোনো বিশেষ কারণ বা নির্দেশনা থাকলে জানাতে পারেন"
                className="mt-1 block w-full rounded-input border border-border bg-paper px-4 py-3 text-ink placeholder:text-slate focus:border-river focus:ring-0"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full rounded-button bg-river px-6 py-3 text-base font-medium text-paper transition-colors hover:bg-river/90 disabled:opacity-50"
            >
              {status === 'submitting' ? 'জমা দেওয়া হচ্ছে...' : 'অপ্ট-আউট নিশ্চিত করুন'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
