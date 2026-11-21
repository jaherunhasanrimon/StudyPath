import { describe, it, expect, vi } from 'vitest';
import {
  submitFeedback,
  listFeedback,
  updateFeedbackStatus,
} from '@/modules/admin/feedback';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('In-App Feedback Module', () => {
  it('submits feedback and stores in database', async () => {
    const mockCreated = {
      id: 'fb-1',
      user_id: 'user-abc',
      category: 'suggestion',
      message: 'Great app! Please add physics chapter 4.',
      status: 'new',
    };

    const insertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockCreated,
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ insert: insertFn }),
    } as unknown as SupabaseClient;

    const result = await submitFeedback(mockSupabase, 'user-abc', {
      category: 'suggestion',
      message: 'Great app! Please add physics chapter 4.',
    });

    expect(result.id).toBe('fb-1');
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-abc',
        category: 'suggestion',
        status: 'new',
      })
    );
  });

  it('lists feedback with optional filtering', async () => {
    const mockList = [
      { id: 'fb-1', category: 'bug', status: 'new' },
      { id: 'fb-2', category: 'bug', status: 'new' },
    ];

    const orderFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockList,
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: orderFn,
        }),
      }),
    } as unknown as SupabaseClient;

    const items = await listFeedback(mockSupabase, {
      category: 'bug',
      status: 'new',
    });

    expect(items).toHaveLength(2);
  });

  it('updates feedback status and records audit log', async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const insertAuditFn = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'feedback') return { update: updateFn };
        if (table === 'audit_logs') return { insert: insertAuditFn };
        return {};
      }),
    } as unknown as SupabaseClient;

    const res = await updateFeedbackStatus(
      mockSupabase,
      'fb-1',
      'resolved',
      'admin-1'
    );

    expect(res.success).toBe(true);
    expect(updateFn).toHaveBeenCalledWith({ status: 'resolved' });
    expect(insertAuditFn).toHaveBeenCalledWith({
      actor_id: 'admin-1',
      action: 'feedback_status_resolved',
      target: 'feedback:fb-1',
    });
  });
});
