/**
 * Unit tests for YouTube playlist import service and 24-hour cache.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePlaylist, clearMemoryCache } from '@/modules/youtube/import';
import { YouTubeClient } from '@/modules/youtube/client';
import { isMetadataExpired, calculateMetadataExpiration } from '@/modules/youtube/retention';
import { DateTime } from 'luxon';

describe('resolvePlaylist', () => {
  beforeEach(() => {
    clearMemoryCache();
    vi.restoreAllMocks();
  });

  it('resolves a new playlist and populates preview structure', async () => {
    const mockClient = new YouTubeClient('mock-key');
    vi.spyOn(mockClient, 'getCompletePlaylist').mockResolvedValueOnce({
      playlistId: 'PL_test1234567890',
      title: 'HSC Higher Math Playlist',
      channelId: 'UC_math',
      channelTitle: 'Math Academy',
      itemCount: 3,
      totalDurationSec: 3600,
      unitsUsed: 3,
      items: [
        {
          videoId: 'v1',
          position: 0,
          title: 'Class 1: Matrices',
          channelId: 'UC_math',
          channelTitle: 'Math Academy',
          durationSec: 1200,
          thumbnailUrl: 'https://img.youtube.com/vi/v1/default.jpg',
          embeddable: true,
          privacyStatus: 'public',
          isUnavailable: false,
          isLive: false,
        },
        {
          videoId: 'v2',
          position: 1,
          title: 'Class 2: Determinants',
          channelId: 'UC_math',
          channelTitle: 'Math Academy',
          durationSec: 1200,
          thumbnailUrl: 'https://img.youtube.com/vi/v2/default.jpg',
          embeddable: true,
          privacyStatus: 'public',
          isUnavailable: false,
          isLive: false,
        },
        {
          videoId: 'v3',
          position: 2,
          title: 'Class 3: Inverses',
          channelId: 'UC_math',
          channelTitle: 'Math Academy',
          durationSec: 1200,
          thumbnailUrl: 'https://img.youtube.com/vi/v3/default.jpg',
          embeddable: true,
          privacyStatus: 'public',
          isUnavailable: false,
          isLive: false,
        },
      ],
    });

    const preview = await resolvePlaylist('https://www.youtube.com/playlist?list=PL_test1234567890', {
      client: mockClient,
    });

    expect(preview.playlistId).toBe('PL_test1234567890');
    expect(preview.title).toBe('HSC Higher Math Playlist');
    expect(preview.items.length).toBe(3);
    expect(preview.cached).toBe(false);
    expect(preview.quotaUnitsUsed).toBe(3);
    expect(preview.order.isSequential).toBe(true);
  });

  it('resolving the same playlist twice within 24 hours makes ZERO API calls', async () => {
    const mockClient = new YouTubeClient('mock-key');
    const spy = vi.spyOn(mockClient, 'getCompletePlaylist').mockResolvedValue({
      playlistId: 'PL_cache_test',
      title: 'Cached Playlist',
      channelId: 'UC1',
      channelTitle: 'Channel 1',
      itemCount: 1,
      totalDurationSec: 600,
      unitsUsed: 3,
      items: [
        {
          videoId: 'v1',
          position: 0,
          title: 'Video 1',
          channelId: 'UC1',
          channelTitle: 'Channel 1',
          durationSec: 600,
          thumbnailUrl: '',
          embeddable: true,
          privacyStatus: 'public',
          isUnavailable: false,
          isLive: false,
        },
      ],
    });

    // 1st call -> calls API
    const firstResult = await resolvePlaylist('PL_cache_test', { client: mockClient });
    expect(firstResult.cached).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);

    // 2nd call -> should hit cache, 0 API calls!
    const secondResult = await resolvePlaylist('PL_cache_test', { client: mockClient });
    expect(secondResult.cached).toBe(true);
    expect(secondResult.quotaUnitsUsed).toBe(0);
    expect(spy).toHaveBeenCalledTimes(1); // Still 1!
  });

  it('detects and flags edge cases: unavailable, live, non-embeddable, duplicate', async () => {
    const mockClient = new YouTubeClient('mock-key');
    vi.spyOn(mockClient, 'getCompletePlaylist').mockResolvedValueOnce({
      playlistId: 'PL_edge1234567890',
      title: 'Edge Cases Playlist',
      channelId: 'UC1',
      channelTitle: 'Channel 1',
      itemCount: 4,
      totalDurationSec: 1000,
      unitsUsed: 3,
      items: [
        {
          videoId: 'v1',
          position: 0,
          title: 'Private video',
          channelId: 'UC1',
          channelTitle: 'Channel 1',
          durationSec: 0,
          thumbnailUrl: '',
          embeddable: true,
          privacyStatus: 'private',
          isUnavailable: true,
          isLive: false,
        },
        {
          videoId: 'v2',
          position: 1,
          title: 'Live Stream Class',
          channelId: 'UC1',
          channelTitle: 'Channel 1',
          durationSec: 0,
          thumbnailUrl: '',
          embeddable: true,
          privacyStatus: 'public',
          isUnavailable: false,
          isLive: true,
        },
        {
          videoId: 'v3',
          position: 2,
          title: 'Non Embeddable Video',
          channelId: 'UC1',
          channelTitle: 'Channel 1',
          durationSec: 500,
          thumbnailUrl: '',
          embeddable: false, // Not embeddable!
          privacyStatus: 'public',
          isUnavailable: false,
          isLive: false,
        },
        {
          videoId: 'v3', // Duplicate!
          position: 3,
          title: 'Non Embeddable Video (Copy)',
          channelId: 'UC1',
          channelTitle: 'Channel 1',
          durationSec: 500,
          thumbnailUrl: '',
          embeddable: false,
          privacyStatus: 'public',
          isUnavailable: false,
          isLive: false,
        },
      ],
    });

    const preview = await resolvePlaylist('PL_edge1234567890', { client: mockClient });

    const warningKinds = preview.warnings.map((w) => w.kind);
    expect(warningKinds).toContain('unavailable');
    expect(warningKinds).toContain('live');
    expect(warningKinds).toContain('not_embeddable');
    expect(warningKinds).toContain('duplicate');
  });
});

describe('retention rules', () => {
  it('calculates 25-day metadata expiration correctly', () => {
    const baseDate = new Date('2026-11-20T10:00:00Z');
    const expiry = calculateMetadataExpiration(baseDate);
    const diffDays = DateTime.fromJSDate(expiry).diff(DateTime.fromJSDate(baseDate), 'days').days;
    expect(diffDays).toBe(25);
  });

  it('determines if metadata is expired', () => {
    const pastDate = DateTime.now().minus({ days: 26 }).toISO();
    const futureDate = DateTime.now().plus({ days: 10 }).toISO();
    expect(isMetadataExpired(pastDate!)).toBe(true);
    expect(isMetadataExpired(futureDate!)).toBe(false);
  });
});
