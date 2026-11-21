import { describe, it, expect, vi } from 'vitest';
import {
  isChannelOptedOut,
  recordCreatorOptOut,
  purgeCreatorInsights,
  listCreatorOptOuts,
  revokeCreatorOptOut,
} from '@/modules/admin/opt-out';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Creator Opt-Out & Shared Insight Purge', () => {
  it('detects when a channel is opted out', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'optout-1' },
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const optedOut = await isChannelOptedOut(mockSupabase, 'UC_12345');
    expect(optedOut).toBe(true);
  });

  it('detects when a channel is NOT opted out', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const optedOut = await isChannelOptedOut(mockSupabase, 'UC_active_creator');
    expect(optedOut).toBe(false);
  });

  it('records creator opt out and writes to audit_logs', async () => {
    const optOutData = {
      id: 'optout-99',
      channel_id: 'UC_test',
      channel_title: 'Test Channel',
      status: 'active',
    };

    const insertAuditFn = vi.fn().mockResolvedValue({ error: null });
    const upsertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: optOutData,
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'creator_opt_outs') return { upsert: upsertFn };
        if (table === 'audit_logs') return { insert: insertAuditFn };
        return {};
      }),
    } as unknown as SupabaseClient;

    const result = await recordCreatorOptOut(
      mockSupabase,
      {
        channel_id: 'UC_test',
        channel_title: 'Test Channel',
      },
      'admin-1'
    );

    expect(result.channel_id).toBe('UC_test');
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        channel_id: 'UC_test',
        status: 'active',
      }),
      { onConflict: 'channel_id' }
    );
    expect(insertAuditFn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'creator_opt_out_recorded',
        target: 'channel:UC_test',
      })
    );
  });

  it('purges creator insights by finding channel videos and deleting video_insights', async () => {
    const mockVideos = [
      { youtube_video_id: 'v1' },
      { youtube_video_id: 'v2' },
      { youtube_video_id: 'v3' },
    ];
    const mockDeleted = [{ id: 'insight-1' }, { id: 'insight-2' }];

    const selectVideosFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockVideos, error: null }),
    });

    const deleteInsightsFn = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockDeleted, error: null }),
      }),
    });

    const insertAuditFn = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'videos') return { select: selectVideosFn };
        if (table === 'video_insights') return { delete: deleteInsightsFn };
        if (table === 'audit_logs') return { insert: insertAuditFn };
        return {};
      }),
    } as unknown as SupabaseClient;

    const purgeResult = await purgeCreatorInsights(mockSupabase, 'UC_purge_channel');
    expect(purgeResult.purgedInsights).toBe(2);
    expect(insertAuditFn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'creator_insights_purged',
        target: 'channel:UC_purge_channel (purged 2 insights)',
      })
    );
  });

  it('revokes an opt out and updates audit log', async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const insertAuditFn = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'creator_opt_outs') return { update: updateFn };
        if (table === 'audit_logs') return { insert: insertAuditFn };
        return {};
      }),
    } as unknown as SupabaseClient;

    const result = await revokeCreatorOptOut(mockSupabase, 'optout-10', 'admin-2');
    expect(result.success).toBe(true);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'revoked' })
    );
    expect(insertAuditFn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'creator_opt_out_revoked',
        target: 'opt_out:optout-10',
      })
    );
  });
});
