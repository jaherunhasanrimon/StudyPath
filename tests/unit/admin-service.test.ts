import { describe, it, expect, vi } from 'vitest';
import {
  verifyAdminRole,
  getReviewQueue,
  updateQuestion,
  hideQuestion,
  approveQuestion,
} from '@/modules/admin/service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Admin Service — Moderation & Review Queue', () => {
  it('returns true if user has admin role in profiles', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const isAdmin = await verifyAdminRole(mockSupabase, 'user-123');
    expect(isAdmin).toBe(true);
  });

  it('returns false if user has student role or query errors', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'student' },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const isAdmin = await verifyAdminRole(mockSupabase, 'user-456');
    expect(isAdmin).toBe(false);
  });

  it('fetches review queue sorted by report count and creation date', async () => {
    const mockQuestions = [
      { id: 'q-1', report_count: 5, stem: 'Faulty Question', is_hidden: false },
      { id: 'q-2', report_count: 1, stem: 'Spelling error', is_hidden: false },
    ];

    const orderFn2 = vi.fn().mockResolvedValue({ data: mockQuestions, error: null });
    const orderFn1 = vi.fn().mockReturnValue({ order: orderFn2 });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: orderFn1,
        }),
      }),
    } as unknown as SupabaseClient;

    const queue = await getReviewQueue(mockSupabase);
    expect(queue).toHaveLength(2);
    expect(queue[0].id).toBe('q-1');
  });

  it('updates question and writes to audit_logs', async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const insertAuditFn = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'questions') {
          return { update: updateFn };
        }
        if (table === 'audit_logs') {
          return { insert: insertAuditFn };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const res = await updateQuestion(mockSupabase, 'admin-1', 'q-10', {
      is_hidden: true,
    });

    expect(res.success).toBe(true);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        is_hidden: true,
        reviewed_by: 'admin-1',
      })
    );
    expect(insertAuditFn).toHaveBeenCalledWith({
      actor_id: 'admin-1',
      action: 'question_hidden',
      target: 'question:q-10',
    });
  });

  it('hideQuestion calls updateQuestion with is_hidden: true', async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const insertAuditFn = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'questions') return { update: updateFn };
        if (table === 'audit_logs') return { insert: insertAuditFn };
        return {};
      }),
    } as unknown as SupabaseClient;

    const res = await hideQuestion(mockSupabase, 'admin-1', 'q-99');
    expect(res.success).toBe(true);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ is_hidden: true })
    );
  });

  it('approveQuestion unhides and sets verifier_status to human_ok', async () => {
    const updateFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const insertAuditFn = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'questions') return { update: updateFn };
        if (table === 'audit_logs') return { insert: insertAuditFn };
        return {};
      }),
    } as unknown as SupabaseClient;

    const res = await approveQuestion(mockSupabase, 'admin-1', 'q-100');
    expect(res.success).toBe(true);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        is_hidden: false,
        verifier_status: 'human_ok',
      })
    );
  });
});
