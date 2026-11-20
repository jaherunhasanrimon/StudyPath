'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PlanItemRow, WatchProgressRow } from '@/modules/plans/types';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';

interface ClassClientProps {
  item: PlanItemRow;
  planId: string;
  initialProgress: WatchProgressRow | null;
  initialNote: string | null;
  nextItemId: string | null;
}

export function ClassClient({
  item,
  planId,
  initialProgress,
  initialNote,
  nextItemId,
}: ClassClientProps) {
  const t = useTranslations('class');
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'notes' | 'quiz'>('notes');
  const [noteBody, setNoteBody] = useState(initialNote || '');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);
  const [isCompleted, setIsCompleted] = useState(item.status === 'done');
  const [completing, setCompleting] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const primaryVideoId = item.video_ids[0] || 'dQw4w9WgXcQ';

  // Throttled progress save
  const handleProgress = useCallback(
    async (lastPositionSec: number, maxPositionSec: number, durationSec: number) => {
      try {
        await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: primaryVideoId,
            planItemId: item.id,
            lastPositionSec,
            maxPositionSec,
            durationSec,
          }),
        });
      } catch {
        // Ignore background sync errors
      }
    },
    [primaryVideoId, item.id]
  );

  // Auto-completed at 90%
  const handleAutoCompleted = useCallback(async () => {
    setIsCompleted(true);
    try {
      await fetch(`/api/plans/${planId}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
    } catch {
      // Ignore
    }
  }, [planId, item.id]);

  // Mark done manually
  const handleMarkDone = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/plans/${planId}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      if (res.ok) {
        setIsCompleted(true);
      }
    } finally {
      setCompleting(false);
    }
  };

  // Debounced note save
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteBody(val);
    setSavingNote(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: primaryVideoId, body: val }),
        });
        setNoteSavedFeedback(true);
        setTimeout(() => setNoteSavedFeedback(false), 2000);
      } finally {
        setSavingNote(false);
      }
    }, 1000);
  };

  return (
    <main id="main-content" className="max-w-[850px] mx-auto px-4 py-6 space-y-6">
      {/* Back button & item breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/plans/${planId}`}
          className="text-xs font-medium text-slate hover:text-ink transition-colors flex items-center gap-1"
        >
          ← {t('backToPathway')}
        </Link>
        <span className="text-xs font-mono text-slate">
          {item.duration_min} min • {item.start_at.slice(0, 10)}
        </span>
      </div>

      {/* Video Player (youtube-nocookie.com, no autoplay) */}
      <YouTubePlayer
        videoId={primaryVideoId}
        initialPositionSec={initialProgress?.last_position_sec || 0}
        onProgress={handleProgress}
        onPauseOrEnd={handleProgress}
        onCompleted={handleAutoCompleted}
      />

      {/* Video Metadata & Actions Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-mist pb-4">
        <div>
          <h1
            className="text-xl sm:text-2xl font-semibold text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {item.label}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate">
            <span>কোর্স ক্লাস</span>
            <span>•</span>
            <a
              href={`https://www.youtube.com/watch?v=${primaryVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-river hover:underline"
            >
              {t('openOnYouTube')} ↗
            </a>
          </div>
        </div>

        {/* Mark Done & Next Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkDone}
            disabled={completing || isCompleted}
            className={`px-4 py-2 rounded-button text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              isCompleted
                ? 'bg-paddy/15 text-paddy border border-paddy/30 cursor-default'
                : 'bg-river text-paper hover:bg-river/90'
            }`}
            style={{ minHeight: '40px' }}
          >
            {isCompleted ? '✓ সম্পন্ন' : completing ? '...' : t('markDone')}
          </button>

          {nextItemId && (
            <button
              type="button"
              onClick={() => router.push(`/class/${nextItemId}`)}
              className="px-4 py-2 rounded-button border border-border text-xs font-medium text-ink hover:border-river hover:text-river transition-colors"
              style={{ minHeight: '40px' }}
            >
              {t('nextItem')} →
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Notes & Quiz */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-mist">
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-river text-river'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {t('notes')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'quiz'
                ? 'border-river text-river'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {t('quiz')}
          </button>
        </div>

        {/* Notes Tab Content */}
        {activeTab === 'notes' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate">
              <label htmlFor="student-notes" className="font-medium">
                {t('notesPlaceholder')}
              </label>
              <span>
                {savingNote
                  ? 'সংরক্ষণ হচ্ছে...'
                  : noteSavedFeedback
                  ? '✓ সংরক্ষিত'
                  : ''}
              </span>
            </div>
            <textarea
              id="student-notes"
              rows={6}
              value={noteBody}
              onChange={handleNoteChange}
              placeholder="ক্লাস চলাকালীন গুরুত্বপূর্ণ সূত্র, পয়েন্ট বা প্রশ্ন লিখে রাখুন..."
              className="w-full rounded-sheet border border-border bg-surface p-3.5 text-sm text-ink placeholder:text-slate focus:border-river focus:ring-0 resize-y"
            />
          </div>
        )}

        {/* Quiz Tab Content (Phase 4 placeholder) */}
        {activeTab === 'quiz' && (
          <div className="p-8 rounded-sheet border border-border bg-surface text-center space-y-2">
            <span className="w-8 h-8 rounded-full bg-marigold/20 text-marigold flex items-center justify-center font-bold text-sm mx-auto">
              ◆
            </span>
            <p className="text-sm font-medium text-ink">{t('quizComingSoon')}</p>
            <p className="text-xs text-slate">
              ফেজ ৪-এ এই ক্লাসের ওপর এআই-নির্মিত কুইজ এবং স্বয়ংক্রিয় গ্রেডিং যুক্ত হবে।
            </p>
          </div>
        )}
      </div>

      {/* Footer Problem Report */}
      <div className="pt-8 text-center">
        <a
          href="https://github.com/jaherunhasanrimon/StudyPath/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate hover:underline"
        >
          ভিডিওটিতে কোনো সমস্যা থাকলে রিপোর্ট করুন
        </a>
      </div>
    </main>
  );
}
