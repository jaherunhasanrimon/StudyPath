'use client';

import { useEffect, useRef, useState, useCallback, useId } from 'react';

// Declarations for window.YT
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

interface YouTubePlayerProps {
  videoId: string;
  initialPositionSec?: number;
  onProgress?: (posSec: number, maxSec: number, durationSec: number) => void;
  onPauseOrEnd?: (posSec: number, maxSec: number, durationSec: number) => void;
  onCompleted?: () => void;
  embeddable?: boolean;
}

export function YouTubePlayer({
  videoId,
  initialPositionSec = 0,
  onProgress,
  onPauseOrEnd,
  onCompleted,
  embeddable = true,
}: YouTubePlayerProps) {
  const uniqueId = useId();
  const containerId = `yt-player-${videoId}-${uniqueId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const maxPositionRef = useRef(initialPositionSec);
  const completedRef = useRef(false);
  const lastReportedTimeRef = useRef(0);
  const [loadError, setLoadError] = useState(false);

  const reportProgress = useCallback(
    (isPauseOrEnd = false) => {
      if (!playerRef.current) return;
      try {
        const current = Math.floor(playerRef.current.getCurrentTime() || 0);
        const duration = Math.floor(playerRef.current.getDuration() || 0);
        if (current > maxPositionRef.current) {
          maxPositionRef.current = current;
        }

        if (isPauseOrEnd) {
          onPauseOrEnd?.(current, maxPositionRef.current, duration);
        } else {
          onProgress?.(current, maxPositionRef.current, duration);
        }

        // 90% completion trigger
        if (!completedRef.current && duration > 0 && maxPositionRef.current / duration >= 0.9) {
          completedRef.current = true;
          onCompleted?.();
        }
      } catch {
        // Player might be destroyed
      }
    },
    [onProgress, onPauseOrEnd, onCompleted]
  );

  useEffect(() => {
    if (!embeddable) return;

    let progressInterval: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      const player = new window.YT.Player(containerId, {
        videoId,
        playerVars: {
          enablejsapi: 1,
          rel: 0,
          playsinline: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          host: 'https://www.youtube-nocookie.com',
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            if (initialPositionSec > 5) {
              event.target.seekTo(initialPositionSec, true);
            }
          },
          onStateChange: (event) => {
            if (event.data === 1) {
              // Playing: poll every 1s, report every 15s
              if (progressInterval) clearInterval(progressInterval);
              progressInterval = setInterval(() => {
                if (playerRef.current) {
                  const current = Math.floor(playerRef.current.getCurrentTime() || 0);
                  if (Math.abs(current - lastReportedTimeRef.current) >= 15) {
                    lastReportedTimeRef.current = current;
                    reportProgress(false);
                  }
                }
              }, 1000);
            } else if (event.data === 2 || event.data === 0) {
              // Paused (2) or Ended (0)
              if (progressInterval) clearInterval(progressInterval);
              reportProgress(true);
            }
          },
          onError: () => {
            setLoadError(true);
          },
        },
      });

      playerRef.current = player;
    };

    // Load YouTube API script if not loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      const oldCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (oldCallback) oldCallback();
        initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [videoId, initialPositionSec, embeddable, reportProgress, containerId]);

  if (!embeddable || loadError) {
    return (
      <div className="aspect-video w-full rounded-sheet bg-ink/90 text-paper flex flex-col items-center justify-center p-6 text-center space-y-3">
        <p className="text-sm font-medium">এই ভিডিওটি অ্যাপের ভেতর চালানো সম্ভব নয়।</p>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-button bg-river text-paper text-xs font-semibold hover:bg-river/90 transition-colors"
        >
          YouTube-এ দেখুন ↗
        </a>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full rounded-sheet overflow-hidden bg-ink shadow-md">
      <div id={containerId} className="w-full h-full" />
    </div>
  );
}
