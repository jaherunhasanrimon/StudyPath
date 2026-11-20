/**
 * High-level YouTube Playlist Import & Resolution Service.
 * Source: docs/architecture.md §6.2 & §6.4.
 *
 * Enforces:
 * - 24-hour cache check (repeat imports make ZERO API calls).
 * - Edge case warnings (unavailable, live, non-embeddable, duplicate, short, over_cap).
 * - Deterministic order analysis.
 * - 25-day metadata expiration for 30-day YouTube policy compliance.
 */
import { parsePlaylistInput } from './parse';
import { YouTubeClient, RawPlaylistResult } from './client';
import { analyzePlaylistOrder } from './order';
import { formatDuration } from './duration';
import { calculateMetadataExpiration } from './retention';
import { PlaylistPreview, PlaylistItemPreview, VideoWarning } from './types';

export const CACHE_TTL_HOURS = 24;
export const MAX_PLAYLIST_CAP = 300;
export const SHORT_VIDEO_THRESHOLD_SEC = 300; // 5 minutes

export interface ImportDependencies {
  client?: YouTubeClient;
  cacheStore?: Map<string, { playlist: PlaylistPreview; fetchedAt: number }>;
}

// In-memory cache for fast repeat resolution and local dev
const inMemoryCache = new Map<string, { playlist: PlaylistPreview; fetchedAt: number }>();

export function getMemoryCache() {
  return inMemoryCache;
}

export function clearMemoryCache() {
  inMemoryCache.clear();
}

/**
 * Resolves a playlist from URL or bare ID.
 * Returns an enriched preview with warnings, formatted durations, and order analysis.
 * If called again within 24 hours for the same playlist, returns cached result with 0 API calls.
 */
export async function resolvePlaylist(
  urlOrId: string,
  deps: ImportDependencies = {}
): Promise<PlaylistPreview> {
  const parseRes = parsePlaylistInput(urlOrId);
  if (!parseRes.success) {
    throw new Error(parseRes.error);
  }

  const { playlistId } = parseRes;
  const cache = deps.cacheStore || inMemoryCache;
  const now = Date.now();

  // 1. Check 24-hour cache
  const cachedEntry = cache.get(playlistId);
  if (cachedEntry) {
    const ageHours = (now - cachedEntry.fetchedAt) / (1000 * 60 * 60);
    if (ageHours < CACHE_TTL_HOURS) {
      return {
        ...cachedEntry.playlist,
        cached: true,
        quotaUnitsUsed: 0,
      };
    }
  }

  // 2. Fetch raw playlist details using YouTube API client
  const client = deps.client || new YouTubeClient();
  const rawData: RawPlaylistResult = await client.getCompletePlaylist(playlistId, MAX_PLAYLIST_CAP);

  // 3. Process video warnings and items
  const seenVideoIds = new Set<string>();
  const allWarnings: VideoWarning[] = [];
  const titles: string[] = [];

  let shortVideoCount = 0;
  let duplicateCount = 0;
  let unavailableCount = 0;
  let notEmbeddableCount = 0;
  let liveCount = 0;

  const items: PlaylistItemPreview[] = rawData.items.map((item) => {
    titles.push(item.title);
    const itemWarnings: VideoWarning[] = [];

    // Duplicate check
    if (seenVideoIds.has(item.videoId)) {
      itemWarnings.push({
        kind: 'duplicate',
        videoId: item.videoId,
        messageKey: 'warning.duplicate',
      });
      duplicateCount++;
    } else {
      seenVideoIds.add(item.videoId);
    }

    // Unavailable (private or deleted) check
    if (item.isUnavailable) {
      itemWarnings.push({
        kind: 'unavailable',
        videoId: item.videoId,
        messageKey: 'warning.unavailable',
      });
      unavailableCount++;
    }

    // Live stream / premiere check
    if (item.isLive || item.durationSec === 0) {
      itemWarnings.push({
        kind: 'live',
        videoId: item.videoId,
        messageKey: 'warning.live',
      });
      liveCount++;
    }

    // Non-embeddable check
    if (!item.embeddable) {
      itemWarnings.push({
        kind: 'not_embeddable',
        videoId: item.videoId,
        messageKey: 'warning.notEmbeddable',
      });
      notEmbeddableCount++;
    }

    // Short video check (< 5 minutes)
    if (!item.isUnavailable && item.durationSec > 0 && item.durationSec < SHORT_VIDEO_THRESHOLD_SEC) {
      shortVideoCount++;
    }

    return {
      videoId: item.videoId,
      position: item.position,
      title: item.title,
      channelId: item.channelId,
      channelTitle: item.channelTitle,
      durationSec: item.durationSec,
      durationFormatted: formatDuration(item.durationSec, 'bn'),
      thumbnailUrl: item.thumbnailUrl,
      embeddable: item.embeddable,
      privacyStatus: item.privacyStatus,
      isUnavailable: item.isUnavailable,
      unavailableReason: item.unavailableReason,
      isLive: item.isLive,
      warnings: itemWarnings,
    };
  });

  // Top-level playlist warnings
  if (unavailableCount > 0) {
    allWarnings.push({
      kind: 'unavailable',
      videoId: '',
      count: unavailableCount,
      messageKey: 'warning.unavailablePlaylist',
    });
  }
  if (liveCount > 0) {
    allWarnings.push({
      kind: 'live',
      videoId: '',
      count: liveCount,
      messageKey: 'warning.livePlaylist',
    });
  }
  if (notEmbeddableCount > 0) {
    allWarnings.push({
      kind: 'not_embeddable',
      videoId: '',
      count: notEmbeddableCount,
      messageKey: 'warning.notEmbeddablePlaylist',
    });
  }
  if (duplicateCount > 0) {
    allWarnings.push({
      kind: 'duplicate',
      videoId: '',
      count: duplicateCount,
      messageKey: 'warning.duplicatePlaylist',
    });
  }
  if (shortVideoCount >= 3) {
    allWarnings.push({
      kind: 'very_short',
      videoId: '',
      count: shortVideoCount,
      messageKey: 'warning.shortVideosGroup',
    });
  }
  if (rawData.itemCount > MAX_PLAYLIST_CAP) {
    allWarnings.push({
      kind: 'over_cap',
      videoId: '',
      count: rawData.itemCount,
      messageKey: 'warning.overCap',
    });
  }

  // 4. Run deterministic order analysis
  const orderResult = analyzePlaylistOrder(titles);

  const preview: PlaylistPreview = {
    playlistId,
    title: rawData.title,
    channelId: rawData.channelId,
    channelTitle: rawData.channelTitle,
    itemCount: items.length,
    totalDurationSec: rawData.totalDurationSec,
    totalDurationFormatted: formatDuration(rawData.totalDurationSec, 'bn'),
    items,
    warnings: allWarnings,
    order: {
      isSequential: orderResult.isSequential,
      status: orderResult.status,
      messageKey: orderResult.messageKey,
    },
    cached: false,
    quotaUnitsUsed: rawData.unitsUsed,
  };

  // 5. Store in cache
  cache.set(playlistId, { playlist: preview, fetchedAt: now });

  // Compute 25-day metadata expiration for database upsert
  calculateMetadataExpiration(new Date(now));

  return preview;
}
