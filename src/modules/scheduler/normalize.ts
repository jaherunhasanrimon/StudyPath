/**
 * src/modules/scheduler/normalize.ts
 *
 * Normalizes input videos:
 * 1. Drops unavailable or zero-duration videos (recording warnings).
 * 2. Sorts strictly by position.
 * 3. Calculates effective study minutes per video.
 *
 * Formula: ceil(durationSec / 60 / playbackSpeed * studyFactor)
 */

import { Video, PlanWarning } from './types';

export interface NormalizedVideo {
  id: string;
  title: string;
  durationSec: number;
  position: number;
  effectiveMin: number;
}

export interface NormalizationResult {
  videos: NormalizedVideo[];
  warnings: PlanWarning[];
}

export function normalizeVideos(
  videos: Video[],
  playbackSpeed: number,
  studyFactor: number
): NormalizationResult {
  const warnings: PlanWarning[] = [];
  const validVideos: NormalizedVideo[] = [];

  let unavailableCount = 0;
  let zeroDurationCount = 0;

  for (const video of videos) {
    if (!video.available) {
      unavailableCount++;
      continue;
    }
    if (video.durationSec <= 0) {
      zeroDurationCount++;
      continue;
    }

    // Effective minutes calculation (architecture.md §7.2 step 1)
    const effectiveMin = Math.max(
      1,
      Math.ceil((video.durationSec / 60 / playbackSpeed) * studyFactor)
    );

    validVideos.push({
      id: video.id,
      title: video.title,
      durationSec: video.durationSec,
      position: video.position,
      effectiveMin,
    });
  }

  // Sort strictly by position ascending
  validVideos.sort((a, b) => a.position - b.position);

  if (unavailableCount > 0) {
    warnings.push({
      type: 'unavailable',
      count: unavailableCount,
      messageKey: 'warning.unavailablePlaylist',
    });
  }

  if (zeroDurationCount > 0) {
    warnings.push({
      type: 'live',
      count: zeroDurationCount,
      messageKey: 'warning.livePlaylist',
    });
  }

  return {
    videos: validVideos,
    warnings,
  };
}
