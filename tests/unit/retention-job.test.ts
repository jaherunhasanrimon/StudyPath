/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { runRetentionJob } from '@/modules/consent/retention';
import { POST as retentionPost } from '@/app/api/jobs/retention/route';
import { NextRequest } from 'next/server';

let mockDeletedCalls: any[] = [{ id: 'call-1' }, { id: 'call-2' }];
let mockExpiredConsents: any[] = [{ id: 'consent-exp-1' }];

vi.mock('@/lib/supabase', () => ({
  createAdminSupabaseClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'ai_calls') {
        return {
          delete: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: mockDeletedCalls, error: null }),
            }),
          }),
        };
      }
      if (table === 'guardian_consents') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: mockExpiredConsents, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    }),
  })),
}));

describe('Data Retention Worker (architecture.md §12 & phases.md §1 Phase 6)', () => {
  describe('runRetentionJob', () => {
    it('purges ai_calls older than 30 days and marks expired pending consents', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'ai_calls') {
            return {
              delete: () => ({
                lt: (col: string, val: string) => {
                  expect(col).toBe('created_at');
                  expect(new Date(val).getTime()).toBeLessThan(Date.now());
                  return {
                    select: vi.fn().mockResolvedValue({ data: [{ id: '1' }, { id: '2' }], error: null }),
                  };
                },
              }),
            };
          }
          if (table === 'guardian_consents') {
            return {
              update: (payload: any) => {
                expect(payload.status).toBe('expired');
                return {
                  eq: (col: string, val: string) => {
                    expect(col).toBe('status');
                    expect(val).toBe('pending');
                    return {
                      lt: (dateCol: string) => {
                        expect(dateCol).toBe('token_expires_at');
                        return {
                          select: vi.fn().mockResolvedValue({ data: [{ id: 'c-exp' }], error: null }),
                        };
                      },
                    };
                  },
                };
              },
            };
          }
          return {} as any;
        },
      } as any;

      const result = await runRetentionJob(mockSupabase);

      expect(result.aiCallsPurged).toBe(2);
      expect(result.consentsExpired).toBe(1);
      expect(result.ranAt).toBeDefined();
    });
  });

  describe('POST /api/jobs/retention', () => {
    it('rejects unauthorized requests when CRON_SECRET is configured and header is wrong', async () => {
      process.env.CRON_SECRET = 'secret-test-token-123';
      const req = new NextRequest('http://localhost:3000/api/jobs/retention', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong-secret' },
      });
      const res = await retentionPost(req);
      expect(res.status).toBe(401);
      delete process.env.CRON_SECRET;
    });

    it('successfully executes retention job with valid bearer authorization', async () => {
      process.env.CRON_SECRET = 'secret-test-token-123';
      mockDeletedCalls = [{ id: '1' }];
      mockExpiredConsents = [{ id: '2' }];

      const req = new NextRequest('http://localhost:3000/api/jobs/retention', {
        method: 'POST',
        headers: { authorization: 'Bearer secret-test-token-123' },
      });
      const res = await retentionPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.stats.aiCallsPurged).toBe(1);
      expect(json.stats.consentsExpired).toBe(1);

      delete process.env.CRON_SECRET;
    });
  });
});
