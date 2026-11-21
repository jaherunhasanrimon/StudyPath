'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import { PlaylistPreview, PlaylistItemPreview } from '@/modules/youtube/types';
import { toBanglaDigits } from '@/modules/youtube/duration';
import { Prefs, Video } from '@/modules/scheduler/types';
import { DEFAULT_AVAILABILITY } from '@/modules/scheduler/schema';
import { buildPlan } from '@/modules/scheduler';
import { StarterPlaylistsGrid } from '@/components/starter/StarterPlaylistsGrid';
import { Step2Pace } from '@/components/wizard/Step2Pace';
import { Step3Checks } from '@/components/wizard/Step3Checks';
import { Step4Plan } from '@/components/wizard/Step4Plan';

export function PlaylistForm() {
  const t = useTranslations();
  const locale = useLocale() as 'bn' | 'en';
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [inputUrl, setInputUrl] = useState(() => searchParams.get('url') ?? '');
  const [loading, setLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PlaylistPreview | null>(null);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const hasAutoResolvedRef = useRef(false);

  // Initialize Prefs with defaults per architecture.md §7.2
  const [prefs, setPrefs] = useState<Prefs>(() => {
    const today = new Date();
    // Default start date: tomorrow or today
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const startDate = tomorrow.toISOString().split('T')[0];

    return {
      timezone: 'Asia/Dhaka',
      startDate,
      pacing: { mode: 'availability' },
      availability: DEFAULT_AVAILABILITY,
      playbackSpeed: 1,
      studyFactor: 1.0,
      grouping: { mode: 'one-per-class' },
      splitLongClasses: true,
      maxClassesPerDay: 2,
      breakMinutes: 5,
      quiz: { cadence: { every: 2 }, questions: 10 },
      assignment: { cadence: { every: 3 }, minutes: 30 },
      review: {
        enabled: false,
        offsetsDays: [1, 3, 7, 21],
        microMinutes: 8,
        maxDailyMinutes: 20,
      },
      weeklyTest: {
        enabled: false,
        weekday: 'fri',
        minutes: 45,
      },
      buffer: { mode: 'none' },
      blackoutDates: [],
    };
  });

  const handleResolve = useCallback(async (urlToResolve: string) => {
    if (!urlToResolve.trim()) {
      setError(t('error.emptyInput'));
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const res = await fetch('/api/playlists/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale,
        },
        body: JSON.stringify({ url: urlToResolve }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t('error.generic'));
      } else {
        setPreview(data);
      }
    } catch {
      setError(t('error.generic'));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  // Auto-resolve if url param is present in query string
  useEffect(() => {
    const urlFromQuery = searchParams.get('url');
    if (urlFromQuery && !hasAutoResolvedRef.current) {
      hasAutoResolvedRef.current = true;
      void handleResolve(urlFromQuery);
    }
  }, [searchParams, handleResolve]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleResolve(inputUrl);
  };

  // Reorder items in state
  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!preview) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= preview.items.length) return;

    const newItems = [...preview.items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Update positions
    newItems.forEach((item, idx) => {
      item.position = idx;
    });

    setPreview({
      ...preview,
      items: newItems,
    });
  };

  // Convert preview items to scheduler Video format
  const schedulerVideos: Video[] = useMemo(() => {
    if (!preview) return [];
    return preview.items.map((it, idx) => ({
      id: it.videoId,
      title: it.title,
      durationSec: it.durationSec ?? (it as unknown as { durationSeconds?: number }).durationSeconds ?? 0,
      position: idx,
      available: !it.isUnavailable,
      embeddable: it.embeddable,
    }));
  }, [preview]);

  const hasShortVideos = useMemo(() => {
    return schedulerVideos.some((v) => v.durationSec > 0 && v.durationSec < 300);
  }, [schedulerVideos]);

  // Pure instant plan computation
  const plan = useMemo(() => {
    if (schedulerVideos.length === 0) return null;
    return buildPlan(schedulerVideos, prefs);
  }, [schedulerVideos, prefs]);

  const displayedVideos: PlaylistItemPreview[] = preview
    ? showAllVideos
      ? preview.items
      : preview.items.slice(0, 5)
    : [];

  const handleStartPlan = async () => {
    if (!preview || !plan) return;
    setSavingPlan(true);
    setError(null);

    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preview.title,
          playlistId: preview.playlistId,
          playlistTitle: preview.title,
          channelTitle: preview.channelTitle,
          prefs,
          videos: schedulerVideos,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push(`/auth/sign-in?redirect=${encodeURIComponent('/new?url=' + inputUrl)}`);
        return;
      }

      if (!res.ok) {
        setError(data.error?.message || t('error.generic'));
        return;
      }

      router.push('/today');
    } catch {
      setError(t('error.generic'));
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <main id="main-content" className="mx-auto max-w-[800px] px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-slate hover:text-ink transition-colors flex items-center gap-1"
        >
          ← {t('app.name')}
        </Link>
        <LanguageSwitcher />
      </div>

      {/* STEP 1: Playlist Import */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Stepper Header */}
          <div className="border-b border-mist pb-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-river">
              {t('newPlan.step1')}
            </p>
            <h1
              className="text-ink font-semibold text-2xl sm:text-3xl mt-1"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('paste.label')}
            </h1>
            <p className="text-sm text-slate mt-1">{t('newPlan.subtitle')}</p>
          </div>

          {/* Paste Box Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="playlist-input" className="sr-only">
                {t('paste.label')}
              </label>
              <input
                id="playlist-input"
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://youtube.com/playlist?list=... or bare ID"
                className="w-full rounded-input border border-border bg-surface px-4 py-3 text-ink placeholder:text-slate focus:border-river focus:ring-0 text-base"
                style={{ height: '56px' }}
                disabled={loading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-button bg-river px-6 py-3 text-base font-medium text-paper transition-colors hover:bg-river/90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ minHeight: '44px' }}
            >
              {loading ? (
                <span>{t('newPlan.resolving')}</span>
              ) : (
                <span>{t('cta.build')}</span>
              )}
            </button>
          </form>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="rounded-input border border-brick bg-brick/10 p-4 text-ink flex items-start gap-3"
            >
              <svg
                className="w-5 h-5 text-brick shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4 animate-pulse" aria-busy="true">
              <div className="h-28 bg-mist/40 rounded-sheet" />
              <div className="h-16 bg-mist/30 rounded-input" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 bg-mist/20 rounded-input" />
                ))}
              </div>
            </div>
          )}

          {/* Starter Playlists Grid for 1-click selection */}
          {!preview && !loading && (
            <div className="pt-6 border-t border-border mt-8">
              <StarterPlaylistsGrid
                compact
                onSelect={(url) => {
                  setInputUrl(url);
                  handleResolve(url);
                }}
              />
            </div>
          )}

          {/* Resolved Playlist Preview */}
          {preview && !loading && (
            <div className="space-y-6">
              {/* Metadata Card */}
              <div className="rounded-sheet bg-surface border border-border p-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-river">
                    {preview.channelTitle}
                  </span>
                  <h2
                    className="text-xl sm:text-2xl font-semibold text-ink"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {preview.title}
                  </h2>
                  <p className="text-sm font-medium text-slate">
                    {locale === 'bn'
                      ? `${toBanglaDigits(preview.itemCount)}টি ক্লাস • ${preview.totalDurationFormatted}`
                      : `${preview.itemCount} classes • ${preview.totalDurationFormatted}`}
                  </p>
                </div>

                {/* Order Analysis Badge */}
                {preview.order && (
                  <div className="pt-2 flex items-center gap-2">
                    {preview.order.isSequential ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-paddy/15 text-paddy">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic message key */}
                        {(t as any)(preview.order.messageKey)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate/20 text-ink">
                        <svg className="w-3.5 h-3.5 text-slate" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic message key */}
                        {(t as any)(preview.order.messageKey)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Warnings */}
              {preview.warnings && preview.warnings.length > 0 && (
                <div className="space-y-2">
                  {preview.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="rounded-input border border-border bg-surface p-3 text-sm text-ink flex items-center gap-2.5"
                    >
                      <span className="text-slate font-bold">!</span>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic message key */}
                      {(t as any)(w.messageKey, {
                        count: locale === 'bn' && w.count ? toBanglaDigits(w.count) : w.count,
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Video List */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">
                  {locale === 'bn' ? 'ক্লাসের তালিকা' : 'Class list'}
                </h3>

                <div className="divide-y divide-mist rounded-sheet border border-border bg-surface overflow-hidden">
                  {displayedVideos.map((video, idx) => (
                    <div
                      key={video.videoId + idx}
                      className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-mist/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 text-sm font-semibold text-slate tabular-nums shrink-0 text-center">
                          {locale === 'bn' ? toBanglaDigits(idx + 1) : idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{video.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate tabular-nums">
                              {video.durationFormatted}
                            </span>
                            {video.isUnavailable && (
                              <span className="text-xs text-brick font-medium">
                                {t('warning.unavailable')}
                              </span>
                            )}
                            {!video.embeddable && (
                              <span className="text-xs text-slate font-medium">
                                {t('newPlan.watchOnYouTube')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Reorder Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveItem(idx, 'up')}
                          disabled={idx === 0}
                          aria-label={`${t('newPlan.moveUp')}: ${video.title}`}
                          className="p-2 rounded-input border border-border text-slate hover:text-ink hover:bg-mist disabled:opacity-30 transition-colors"
                          style={{ minWidth: '36px', minHeight: '36px' }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(idx, 'down')}
                          disabled={idx === preview.items.length - 1}
                          aria-label={`${t('newPlan.moveDown')}: ${video.title}`}
                          className="p-2 rounded-input border border-border text-slate hover:text-ink hover:bg-mist disabled:opacity-30 transition-colors"
                          style={{ minWidth: '36px', minHeight: '36px' }}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {preview.items.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllVideos(!showAllVideos)}
                    className="w-full py-2.5 text-sm font-medium text-river hover:underline"
                  >
                    {showAllVideos
                      ? t('newPlan.showLess')
                      : t('newPlan.showAll', {
                          count:
                            locale === 'bn'
                              ? toBanglaDigits(preview.items.length)
                              : preview.items.length,
                        })}
                  </button>
                )}
              </div>

              {/* Continue to Step 2 (Pace) Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full rounded-button bg-river px-6 py-3.5 text-base font-medium text-paper hover:bg-river/90 shadow-xs transition-colors flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                >
                  <span>{t('newPlan.continueToPace')}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Pace */}
      {step === 2 && (
        <Step2Pace
          prefs={prefs}
          hasShortVideos={hasShortVideos}
          onChange={setPrefs}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {/* STEP 3: Checks */}
      {step === 3 && (
        <Step3Checks
          prefs={prefs}
          totalClasses={schedulerVideos.length}
          onChange={setPrefs}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {/* STEP 4: Plan Preview */}
      {step === 4 && plan && (
        <Step4Plan
          plan={plan}
          prefs={prefs}
          onApplySuggestion={(updatedPrefs) => setPrefs(updatedPrefs)}
          onChangeSettings={() => setStep(2)}
          onStartPlan={handleStartPlan}
          savingPlan={savingPlan}
        />
      )}
    </main>
  );
}
