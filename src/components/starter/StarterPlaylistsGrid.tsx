'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STARTER_PLAYLISTS, StarterPlaylist } from '@/modules/admin/starter-playlists';

interface StarterPlaylistsGridProps {
  onSelect?: (url: string) => void;
  compact?: boolean;
}

export function StarterPlaylistsGrid({ onSelect, compact = false }: StarterPlaylistsGridProps) {
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const filteredPlaylists = STARTER_PLAYLISTS.filter((p) => {
    if (selectedSubject !== 'all' && p.subject !== selectedSubject) return false;
    if (selectedLevel !== 'all' && p.level !== selectedLevel) return false;
    return true;
  });

  const handleChoose = (playlist: StarterPlaylist) => {
    if (onSelect) {
      onSelect(playlist.playlistUrl);
    } else {
      router.push(`/new?url=${encodeURIComponent(playlist.playlistUrl)}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-display font-semibold text-ink">
              যাচাইকৃত নমুনা প্লেলিস্ট (Verified Starter Playlists)
            </h2>
            <p className="text-xs text-slate mt-0.5">
              অভিজ্ঞ মডারেটর দ্বারা যাচাইকৃত ১০টি সেরা এসএসসি ও এইচএসসি প্লেলিস্ট। ১-ক্লিকেই রুটিন বানান।
            </p>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {['all', 'SSC', 'HSC'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedLevel === lvl
                    ? 'bg-river text-paper border-river'
                    : 'border-border text-slate hover:text-ink hover:bg-mist'
                }`}
              >
                {lvl === 'all' ? 'সব লেভেল' : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'সব বিষয়' },
            { id: 'math', label: '📐 গণিত' },
            { id: 'physics', label: '⚡ পদার্থবিজ্ঞান' },
            { id: 'chemistry', label: '🧪 রসায়ন' },
            { id: 'english', label: '📖 ইংরেজি' },
            { id: 'ict', label: '💻 আইসিটি' },
            { id: 'biology', label: '🌱 জীববিজ্ঞান' },
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubject(sub.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedSubject === sub.id
                  ? 'bg-slate/20 text-ink font-semibold'
                  : 'text-slate hover:text-ink hover:bg-mist'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Starter Cards */}
      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-4`}>
        {filteredPlaylists.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-card border border-border bg-surface p-5 hover:border-river/60 hover:shadow-sm transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-block px-2 py-0.5 text-[11px] font-bold uppercase rounded bg-river/10 text-river">
                  {item.level}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 dark:text-teal-300">
                  <span>✓</span>
                  <span>যাচাইকৃত</span>
                </span>
              </div>

              <div>
                <h3 className="text-base font-semibold text-ink line-clamp-2 leading-snug">
                  {item.titleBn}
                </h3>
                <p className="text-xs text-slate mt-1">{item.channelTitle}</p>
              </div>

              <p className="text-xs text-slate/90 line-clamp-2 leading-relaxed">
                {item.descriptionBn}
              </p>
            </div>

            <div className="pt-4 border-t border-border/60 mt-4 flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate">
                <span>{item.itemCount} টি ক্লাস</span> • <span>~{item.durationHours} ঘণ্টা</span>
              </div>
              <button
                onClick={() => handleChoose(item)}
                className="rounded-button bg-river px-3.5 py-1.5 text-xs font-medium text-paper transition-colors hover:bg-river/90"
              >
                রুটিন তৈরি করুন →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
