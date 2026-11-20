'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toBanglaDigits } from '@/modules/youtube/duration';

interface ReplanModalProps {
  planId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPlanId: string) => void;
}

interface ReplanDiffResponse {
  preview: boolean;
  strategy: 'shift' | 'compress' | 'balanced';
  diff: {
    moved: Array<{ id: string; oldDate: string; oldStart: string; newDate: string; newStart: string }>;
    added: string[];
    removed: string[];
  };
  originalLastDate: string;
  newLastDate: string;
}

export function ReplanModal({ planId, isOpen, onClose, onSuccess }: ReplanModalProps) {
  const t = useTranslations('replan');
  const locale = useLocale();

  const [strategy, setStrategy] = useState<'shift' | 'compress' | 'balanced'>('shift');
  const [submitting, setSubmitting] = useState(false);
  const [diffData, setDiffData] = useState<ReplanDiffResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = !diffData && !error;

  const handleSelectStrategy = (s: 'shift' | 'compress' | 'balanced') => {
    setStrategy(s);
    setDiffData(null);
    setError(null);
  };

  // Fetch live diff preview whenever strategy changes
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    fetch(`/api/plans/${planId}/replan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy, confirm: false }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.error) {
          setError(data.error.message || 'Failed to preview replan');
        } else {
          setDiffData(data);
          setError(null);
        }
      })
      .catch(() => {
        if (active) {
          setError('Network error while previewing replan');
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, planId, strategy]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${planId}/replan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'Failed to apply replan');
      } else {
        onSuccess(data.newPlanId);
      }
    } catch {
      setError('Network error while applying replan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="replan-title"
      className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div className="bg-surface rounded-sheet max-w-lg w-full p-6 space-y-5 border border-border shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-mist pb-3">
          <div>
            <h2
              id="replan-title"
              className="font-semibold text-xl text-ink"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('title')}
            </h2>
            <p className="text-xs text-slate mt-0.5">{t('subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate hover:text-ink text-xl leading-none p-1"
          >
            ✕
          </button>
        </div>

        {/* Strategy Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate">
            {t('strategy')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(['shift', 'compress', 'balanced'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelectStrategy(s)}
                className={`p-3 rounded-input border text-left transition-all ${
                  strategy === s
                    ? 'border-river bg-river/10 text-river ring-1 ring-river'
                    : 'border-border bg-surface text-ink hover:border-river/50'
                }`}
              >
                <p className="text-xs font-bold">{t(s)}</p>
                <p className="text-[11px] text-slate mt-1 line-clamp-3">{t(`${s}Desc`)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Diff Preview */}
        {loading ? (
          <div className="py-6 text-center text-xs text-slate animate-pulse">
            হিসাব করা হচ্ছে...
          </div>
        ) : diffData ? (
          <div className="p-3.5 bg-paper rounded-sheet border border-border space-y-2.5 text-xs text-ink">
            <p className="font-semibold">{t('diffTitle')}</p>
            <div className="flex items-center justify-between">
              <span className="text-slate">{t('movedCount', {
                count: locale === 'bn' ? toBanglaDigits(diffData.diff.moved.length) : diffData.diff.moved.length,
              })}</span>
              <span className="font-mono text-river font-medium">
                {diffData.originalLastDate} → {diffData.newLastDate}
              </span>
            </div>
            <div className="flex justify-between text-slate pt-1 border-t border-mist/60 text-[11px]">
              <span>{t('originalEnd')}: {diffData.originalLastDate}</span>
              <span>{t('newEnd')}: {diffData.newLastDate}</span>
            </div>
          </div>
        ) : null}

        {error && (
          <p className="text-xs text-brick font-medium p-2 bg-brick/10 rounded-input border border-brick/30">
            {error}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-button border border-border text-xs font-medium text-slate hover:text-ink hover:bg-mist/30 transition-colors"
          >
            {t('canceling')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || loading}
            className="px-5 py-2.5 rounded-button bg-river text-paper text-xs font-medium hover:bg-river/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {submitting ? 'সংরক্ষণ হচ্ছে...' : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
