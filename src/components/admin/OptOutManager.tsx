'use client';

import { useState } from 'react';
import { CreatorOptOut } from '@/modules/admin/types';

interface OptOutManagerProps {
  initialOptOuts: CreatorOptOut[];
}

export function OptOutManager({ initialOptOuts }: OptOutManagerProps) {
  const [optOuts, setOptOuts] = useState<CreatorOptOut[]>(initialOptOuts);
  const [channelId, setChannelId] = useState('');
  const [channelTitle, setChannelTitle] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleAddOptOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/opt-outs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId.trim(),
          channel_title: channelTitle.trim(),
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add opt-out');

      setOptOuts((prev) => [data.optOut, ...prev.filter((o) => o.channel_id !== data.optOut.channel_id)]);
      setChannelId('');
      setChannelTitle('');
      setReason('');
      setMessage({
        text: `চ্যানেল অপ্ট-আউট সম্পন্ন হয়েছে। মোট ${data.purgedInsights} টি শেয়ার্ড ইনসাইট পার্জ করা হয়েছে।`,
        type: 'success',
      });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Error adding opt-out',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('আপনি কি এই অপ্ট-আউট প্রত্যাহার করতে চান?')) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/opt-outs/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to revoke opt-out');

      setOptOuts((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'revoked' } : o))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error revoking opt-out');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Add Opt-Out Form */}
      <div className="rounded-card border border-border bg-surface p-6 space-y-4">
        <h3 className="text-lg font-semibold text-ink">নতুন ক্রিয়েটর অপ্ট-আউট যুক্ত করুন</h3>
        <p className="text-xs text-slate">
          চ্যানেল আইডি দিলে তৎক্ষণাৎ ওই চ্যানেলের সকল ভিডিওর এআই ইনসাইট ডাটাবেজ থেকে মুছে দেওয়া হবে
          এবং পরবর্তীতে নতুন ইনসাইট তৈরি রোধ করা হবে।
        </p>

        {message && (
          <div
            className={`p-3 rounded-button text-sm ${
              message.type === 'success'
                ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200 border border-teal-200'
                : 'bg-crimson/10 text-crimson border border-crimson/20'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleAddOptOut} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="optout-channel-id" className="block text-xs font-medium text-slate mb-1">
              ইউটিউব চ্যানেল আইডি (Channel ID)
            </label>
            <input
              id="optout-channel-id"
              type="text"
              required
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="UC_..."
              className="w-full rounded-input border border-border bg-paper px-3 py-2 text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor="optout-channel-title" className="block text-xs font-medium text-slate mb-1">
              চ্যানেলের নাম (Channel Title)
            </label>
            <input
              id="optout-channel-title"
              type="text"
              required
              value={channelTitle}
              onChange={(e) => setChannelTitle(e.target.value)}
              placeholder="চ্যানেলের নাম"
              className="w-full rounded-input border border-border bg-paper px-3 py-2 text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor="optout-reason" className="block text-xs font-medium text-slate mb-1">
              কারণ / রেফারেন্স (ঐচ্ছিক)
            </label>
            <input
              id="optout-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ইমেইল বা অনুরোধের রেফারেন্স"
              className="w-full rounded-input border border-border bg-paper px-3 py-2 text-sm text-ink"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-button bg-river text-paper text-sm font-medium hover:bg-river/90 disabled:opacity-50"
            >
              {isSubmitting ? 'প্রসেস হচ্ছে...' : 'অপ্ট-আউট ও ইনসাইট পার্জ করুন'}
            </button>
          </div>
        </form>
      </div>

      {/* Opt-Outs List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-ink">
          অপ্ট-আউটকৃত চ্যানেলসমূহ ({optOuts.length})
        </h3>

        {optOuts.length === 0 ? (
          <div className="rounded-card border border-border p-8 text-center text-slate bg-surface">
            এখনও কোনো চ্যানেল অপ্ট-আউট তালিকায় নেই।
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full text-left text-sm text-ink border-collapse">
              <thead className="bg-mist/50 border-b border-border text-xs uppercase text-slate font-medium">
                <tr>
                  <th className="p-3">চ্যানেল আইডি</th>
                  <th className="p-3">চ্যানেলের নাম</th>
                  <th className="p-3">কারণ / নোট</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {optOuts.map((o) => (
                  <tr key={o.id} className="hover:bg-mist/30">
                    <td className="p-3 font-mono text-xs text-slate">{o.channel_id}</td>
                    <td className="p-3 font-medium">{o.channel_title}</td>
                    <td className="p-3 text-xs text-slate">{o.reason || '—'}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          o.status === 'active'
                            ? 'bg-crimson/10 text-crimson'
                            : 'bg-slate/20 text-slate'
                        }`}
                      >
                        {o.status === 'active' ? 'সক্রিয় অপ্ট-আউট' : 'প্রত্যাহারকৃত'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {o.status === 'active' && (
                        <button
                          onClick={() => handleRevoke(o.id)}
                          disabled={isSubmitting}
                          className="px-2.5 py-1 rounded text-xs font-medium border border-border text-slate hover:bg-mist"
                        >
                          প্রত্যাহার
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
