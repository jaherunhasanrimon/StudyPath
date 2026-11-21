/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { exportUserData } from '@/modules/consent/export';
import { GET as exportGet } from '@/app/api/account/export/route';
import { POST as deletePost } from '@/app/api/account/delete/route';
import { NextRequest } from 'next/server';

let mockUser: any = { id: 'user-export-1', email: 'student@example.com' };

vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: table === 'profiles' ? { id: 'user-export-1', display_name: 'Sakib' } : null,
          }),
        }),
      }),
    })),
  })),
  createAdminSupabaseClient: vi.fn(() => ({
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: vi.fn(() => ({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
  })),
}));

describe('Data Export & Account Deletion (architecture.md §12 & phases.md §1 Phase 6)', () => {
  describe('exportUserData', () => {
    it('aggregates student data across all database tables into structured JSON', async () => {
      const mockSupabase = {
        from: (table: string) => ({
          select: () => ({
            eq: () => {
              if (table === 'profiles') {
                return { maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-1', birth_year: 2008 } }) };
              }
              if (table === 'notification_preferences') {
                return { maybeSingle: vi.fn().mockResolvedValue({ data: { push_enabled: true } }) };
              }
              if (table === 'guardian_consents') {
                return Promise.resolve({ data: [{ id: 'c1', status: 'granted' }] });
              }
              if (table === 'study_plans') {
                return Promise.resolve({ data: [{ id: 'sp1', name: 'Math HSC' }] });
              }
              if (table === 'watch_progress') {
                return Promise.resolve({ data: [{ video_id: 'v1', completed: true }] });
              }
              if (table === 'notes') {
                return Promise.resolve({ data: [{ id: 'n1', body: 'Formula sheet' }] });
              }
              if (table === 'attempts') {
                return Promise.resolve({ data: [{ id: 'a1', score: 10 }] });
              }
              return Promise.resolve({ data: [] });
            },
          }),
        }),
      } as any;

      const data = await exportUserData(mockSupabase, 'user-1');

      expect(data.user_id).toBe('user-1');
      expect(data.exported_at).toBeDefined();
      expect(data.profile).toBeDefined();
      expect(data.consents).toHaveLength(1);
      expect(data.study_plans).toHaveLength(1);
      expect(data.watch_progress).toHaveLength(1);
      expect(data.notes).toHaveLength(1);
      expect(data.quiz_attempts).toHaveLength(1);
    });
  });

  describe('GET /api/account/export', () => {
    it('returns 401 when student is unauthenticated', async () => {
      mockUser = null;
      const res = await exportGet();
      expect(res.status).toBe(401);
    });

    it('returns downloadable JSON attachment when student is authenticated', async () => {
      mockUser = { id: 'user-export-1' };
      const res = await exportGet();
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/json');
      expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="dishari-data-');
    });
  });

  describe('POST /api/account/delete', () => {
    it('returns 401 when unauthenticated', async () => {
      mockUser = null;
      const req = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      const res = await deletePost(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when confirmation string is not exactly DELETE', async () => {
      mockUser = { id: 'user-export-1' };
      const req = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({ confirmation: 'delete' }), // lowercase
      });
      const res = await deletePost(req);
      expect(res.status).toBe(400);
    });

    it('deletes user account and returns success when confirmed with DELETE', async () => {
      mockUser = { id: 'user-export-1' };
      const req = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      const res = await deletePost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.message).toContain('permanently deleted');
    });
  });
});
