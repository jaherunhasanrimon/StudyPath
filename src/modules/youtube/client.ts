/**
 * YouTube Data API v3 Client.
 * Source: docs/architecture.md §6.2.
 *
 * Rules:
 * - NEVER use search endpoint (cost 100 units).
 * - Only playlists.list (1 unit), playlistItems.list (1 unit), videos.list (1 unit).
 * - Batches video detail requests in chunks of at most 50 IDs.
 * - Paginates playlist items with nextPageToken.
 * - Enforces daily project quota tracker and circuit breaker at 80%.
 */
import { parseIsoDuration } from './duration';

export const DAILY_QUOTA_LIMIT = 10000;
export const QUOTA_CIRCUIT_BREAKER = 8000; // 80% of limit

export interface RawPlaylistItem {
  videoId: string;
  position: number;
  title: string;
  channelId: string;
  channelTitle: string;
  durationSec: number;
  thumbnailUrl: string;
  embeddable: boolean;
  privacyStatus: string;
  isUnavailable: boolean;
  unavailableReason?: string;
  isLive: boolean;
}

export interface RawPlaylistResult {
  playlistId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  itemCount: number;
  totalDurationSec: number;
  items: RawPlaylistItem[];
  unitsUsed: number;
}

export class YouTubeClient {
  private apiKey: string;
  private quotaUsedToday: number = 0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY || '';
  }

  getQuotaUsedToday(): number {
    return this.quotaUsedToday;
  }

  setQuotaUsedToday(units: number): void {
    this.quotaUsedToday = units;
  }

  /**
   * Fetches the complete playlist metadata, item list, and detailed video metadata.
   */
  async getCompletePlaylist(
    playlistId: string,
    maxLimit: number = 300
  ): Promise<RawPlaylistResult> {
    // Missing API key check
    if (!this.apiKey || !this.apiKey.trim()) {
      throw new Error('CONFIG_ERROR: YouTube API key is missing. Set YOUTUBE_API_KEY in environment variables.');
    }

    // Quota circuit breaker check
    if (this.quotaUsedToday >= QUOTA_CIRCUIT_BREAKER) {
      throw new Error('QUOTA_EXCEEDED');
    }

    const unitsBefore = this.quotaUsedToday;

    // 1. Fetch playlist snippet & contentDetails (playlists.list)
    const playlistMeta = await this.fetchPlaylistMetadata(playlistId);

    // 2. Fetch all playlist items (playlistItems.list, max 50 per page)
    const rawItems = await this.fetchAllPlaylistItems(playlistId, maxLimit);

    // 3. Fetch detailed video properties in batches of 50 (videos.list)
    const videoIds = rawItems.map((item) => item.videoId).filter(Boolean);
    const videoDetailsMap = await this.fetchVideosDetailsBatched(videoIds);

    // 4. Merge item and video data
    let totalDurationSec = 0;
    const finalItems: RawPlaylistItem[] = rawItems.map((item) => {
      const videoDetail = videoDetailsMap.get(item.videoId);

      const isUnavailable =
        !videoDetail ||
        item.title === 'Private video' ||
        item.title === 'Deleted video' ||
        videoDetail.privacyStatus === 'private';

      const durationSec = videoDetail ? videoDetail.durationSec : 0;
      totalDurationSec += durationSec;

      return {
        videoId: item.videoId,
        position: item.position,
        title: videoDetail?.title || item.title,
        channelId: videoDetail?.channelId || playlistMeta.channelId,
        channelTitle: videoDetail?.channelTitle || playlistMeta.channelTitle,
        durationSec,
        thumbnailUrl: videoDetail?.thumbnailUrl || item.thumbnailUrl || '',
        embeddable: videoDetail ? videoDetail.embeddable : false,
        privacyStatus: videoDetail?.privacyStatus || (isUnavailable ? 'private' : 'public'),
        isUnavailable,
        unavailableReason: isUnavailable ? 'Video is private or deleted' : undefined,
        isLive: videoDetail ? videoDetail.isLive : false,
      };
    });

    const unitsUsed = this.quotaUsedToday - unitsBefore;

    return {
      playlistId,
      title: playlistMeta.title,
      channelId: playlistMeta.channelId,
      channelTitle: playlistMeta.channelTitle,
      itemCount: finalItems.length,
      totalDurationSec,
      items: finalItems,
      unitsUsed,
    };
  }

  private async fetchPlaylistMetadata(
    playlistId: string
  ): Promise<{ title: string; channelId: string; channelTitle: string; itemCount: number }> {
    this.recordQuotaUse(1);

    const url = new URL('https://www.googleapis.com/youtube/v3/playlists');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('id', playlistId);
    url.searchParams.set('key', this.apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const reason = errJson?.error?.errors?.[0]?.reason || errJson?.error?.status;
      const message = errJson?.error?.message || res.statusText;

      if (res.status === 403) {
        if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
          throw new Error('QUOTA_EXCEEDED');
        }
        if (reason === 'playlistForbidden') {
          throw new Error('PLAYLIST_PRIVATE');
        }
        if (
          reason === 'keyInvalid' ||
          reason === 'accessNotConfigured' ||
          reason === 'PERMISSION_DENIED' ||
          reason === 'forbidden'
        ) {
          throw new Error(`CONFIG_ERROR: YouTube API key error (${reason}): ${message}`);
        }
        throw new Error(`UPSTREAM_ERROR: ${message}`);
      }
      if (res.status === 404) throw new Error('PLAYLIST_NOT_FOUND');
      throw new Error(`UPSTREAM_ERROR: ${message}`);
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('PLAYLIST_NOT_FOUND');
    }

    const item = data.items[0];
    return {
      title: item.snippet?.title || 'Untitled Playlist',
      channelId: item.snippet?.channelId || '',
      channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
      itemCount: item.contentDetails?.itemCount || 0,
    };
  }

  private async fetchAllPlaylistItems(
    playlistId: string,
    maxLimit: number
  ): Promise<Array<{ videoId: string; position: number; title: string; thumbnailUrl: string }>> {
    const items: Array<{ videoId: string; position: number; title: string; thumbnailUrl: string }> = [];
    let pageToken: string | undefined = undefined;

    do {
      this.recordQuotaUse(1);

      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      url.searchParams.set('part', 'snippet,contentDetails');
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('playlistId', playlistId);
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      url.searchParams.set('key', this.apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`UPSTREAM_ERROR: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.items || data.items.length === 0) {
        break;
      }

      for (let i = 0; i < data.items.length; i++) {
        const entry = data.items[i];
        const videoId =
          entry.contentDetails?.videoId || entry.snippet?.resourceId?.videoId;
        const position = entry.snippet?.position ?? items.length;
        const title = entry.snippet?.title || '';
        const thumbnailUrl =
          entry.snippet?.thumbnails?.medium?.url ||
          entry.snippet?.thumbnails?.default?.url ||
          '';

        items.push({ videoId, position, title, thumbnailUrl });

        if (items.length >= maxLimit) break;
      }

      pageToken = data.nextPageToken;
    } while (pageToken && items.length < maxLimit);

    return items;
  }

  private async fetchVideosDetailsBatched(
    videoIds: string[]
  ): Promise<
    Map<
      string,
      {
        title: string;
        channelId: string;
        channelTitle: string;
        durationSec: number;
        thumbnailUrl: string;
        embeddable: boolean;
        privacyStatus: string;
        isLive: boolean;
      }
    >
  > {
    const results = new Map();
    if (videoIds.length === 0) return results;

    // Chunk video IDs into batches of at most 50
    const chunkSize = 50;
    for (let i = 0; i < videoIds.length; i += chunkSize) {
      const batchIds = videoIds.slice(i, i + chunkSize);
      this.recordQuotaUse(1);

      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'contentDetails,status,snippet');
      url.searchParams.set('id', batchIds.join(','));
      url.searchParams.set('key', this.apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      if (data.items) {
        for (const item of data.items) {
          const id = item.id;
          const durationSec = parseIsoDuration(item.contentDetails?.duration || '');
          const isLive =
            item.snippet?.liveBroadcastContent === 'live' ||
            item.snippet?.liveBroadcastContent === 'upcoming' ||
            durationSec === 0;

          results.set(id, {
            title: item.snippet?.title || '',
            channelId: item.snippet?.channelId || '',
            channelTitle: item.snippet?.channelTitle || '',
            durationSec,
            thumbnailUrl:
              item.snippet?.thumbnails?.medium?.url ||
              item.snippet?.thumbnails?.default?.url ||
              '',
            embeddable: item.status?.embeddable !== false,
            privacyStatus: item.status?.privacyStatus || 'public',
            isLive,
          });
        }
      }
    }

    return results;
  }

  private recordQuotaUse(units: number) {
    this.quotaUsedToday += units;
  }
}
