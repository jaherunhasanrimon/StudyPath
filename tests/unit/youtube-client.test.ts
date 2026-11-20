/**
 * Unit tests for YouTube Data API v3 client with mocked network calls.
 * Tests batching of 50, pagination, quota arithmetic, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  YouTubeClient,
  QUOTA_CIRCUIT_BREAKER,
} from '@/modules/youtube/client';

describe('YouTubeClient', () => {
  let client: YouTubeClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new YouTubeClient('test-api-key');
  });

  it('calculates quota correctly for a small playlist (1 playlist + 1 page of items + 1 batch of videos = 3 units)', async () => {
    const mockFetch = vi.fn();
    // 1. playlists.list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'PL123',
            snippet: { title: 'Test Playlist', channelId: 'UC123', channelTitle: 'Test Channel' },
            contentDetails: { itemCount: 2 },
          },
        ],
      }),
    });
    // 2. playlistItems.list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { snippet: { resourceId: { videoId: 'v1' }, title: 'Video 1', position: 0 } },
          { snippet: { resourceId: { videoId: 'v2' }, title: 'Video 2', position: 1 } },
        ],
      }),
    });
    // 3. videos.list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { id: 'v1', snippet: { title: 'Video 1' }, contentDetails: { duration: 'PT10M' }, status: { embeddable: true, privacyStatus: 'public' } },
          { id: 'v2', snippet: { title: 'Video 2' }, contentDetails: { duration: 'PT20M' }, status: { embeddable: true, privacyStatus: 'public' } },
        ],
      }),
    });

    global.fetch = mockFetch;

    const result = await client.getCompletePlaylist('PL123');
    expect(result.items.length).toBe(2);
    expect(result.unitsUsed).toBe(3);
    expect(client.getQuotaUsedToday()).toBe(3);
  });

  it('batches video details in chunks of at most 50 IDs', async () => {
    const mockFetch = vi.fn();
    // 1. playlists.list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'PL100',
            snippet: { title: '100 Videos Playlist', channelId: 'UC100', channelTitle: 'Channel 100' },
            contentDetails: { itemCount: 100 },
          },
        ],
      }),
    });

    // Generate 100 mock video IDs
    const mockItemsPage1 = Array.from({ length: 50 }, (_, i) => ({
      snippet: { resourceId: { videoId: `vid_${i}` }, title: `Video ${i}`, position: i },
    }));
    const mockItemsPage2 = Array.from({ length: 50 }, (_, i) => ({
      snippet: { resourceId: { videoId: `vid_${50 + i}` }, title: `Video ${50 + i}`, position: 50 + i },
    }));

    // 2. playlistItems.list Page 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockItemsPage1,
        nextPageToken: 'token_page_2',
      }),
    });
    // 3. playlistItems.list Page 2
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockItemsPage2,
      }),
    });

    // 4. videos.list Batch 1 (IDs 0..49)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockItemsPage1.map((item) => ({
          id: item.snippet.resourceId.videoId,
          snippet: { title: item.snippet.title },
          contentDetails: { duration: 'PT15M' },
          status: { embeddable: true, privacyStatus: 'public' },
        })),
      }),
    });

    // 5. videos.list Batch 2 (IDs 50..99)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockItemsPage2.map((item) => ({
          id: item.snippet.resourceId.videoId,
          snippet: { title: item.snippet.title },
          contentDetails: { duration: 'PT15M' },
          status: { embeddable: true, privacyStatus: 'public' },
        })),
      }),
    });

    global.fetch = mockFetch;

    const result = await client.getCompletePlaylist('PL100');
    expect(result.items.length).toBe(100);

    // Total calls: 1 (playlist) + 2 (items pages) + 2 (video batches of 50) = 5 units
    expect(result.unitsUsed).toBe(5);
    expect(mockFetch).toHaveBeenCalledTimes(5);

    // Verify batching parameter
    const call4Url = mockFetch.mock.calls[3][0] as string;
    const call5Url = mockFetch.mock.calls[4][0] as string;
    expect(call4Url).toContain('videos?');
    expect(call5Url).toContain('videos?');
  });

  it('throws specific error when playlist is not found or private', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [], // Empty items = not found or private
      }),
    });
    global.fetch = mockFetch;

    await expect(client.getCompletePlaylist('PL_nonexistent')).rejects.toThrow(
      'PLAYLIST_NOT_FOUND'
    );
  });

  it('triggers circuit breaker when quota reaches 80%', async () => {
    // Manually set quota usage to breaker threshold
    client.setQuotaUsedToday(QUOTA_CIRCUIT_BREAKER);

    await expect(client.getCompletePlaylist('PL123')).rejects.toThrow('QUOTA_EXCEEDED');
  });
});
