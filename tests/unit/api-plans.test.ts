import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createPlanHandler, GET as listPlansHandler } from '@/app/api/plans/route';
import { GET as getTodayHandler } from '@/app/api/today/route';
import { POST as saveProgressHandler } from '@/app/api/progress/route';
import { GET as getCalendarFeedHandler } from '@/app/api/calendar/[planId]/route';
import { POST as replanHandler } from '@/app/api/plans/[id]/replan/route';

// Mock Supabase
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe('Plans & Progress API Endpoints (Auth & Validation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/plans', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

      const req = new NextRequest('http://localhost:3000/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Plan 1' }),
      });

      const res = await createPlanHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 when payload fails validation', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

      const req = new NextRequest('http://localhost:3000/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }), // Invalid
      });

      const res = await createPlanHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/plans', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

      const res = await listPlansHandler();
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/today', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

      const req = new NextRequest('http://localhost:3000/api/today');
      const res = await getTodayHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/progress', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

      const req = new NextRequest('http://localhost:3000/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: 'vid-1', lastPositionSec: 30, maxPositionSec: 30 }),
      });

      const res = await saveProgressHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/calendar/:planId.ics', () => {
    it('returns 401 when token query param is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/plan-123.ics');
      const res = await getCalendarFeedHandler(req, {
        params: Promise.resolve({ planId: 'plan-123.ics' }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('TOKEN_REQUIRED');
    });

    it('returns 403 when token is invalid or tampered', async () => {
      const req = new NextRequest('http://localhost:3000/api/calendar/plan-123.ics?token=invalid-fake-token');
      const res = await getCalendarFeedHandler(req, {
        params: Promise.resolve({ planId: 'plan-123.ics' }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/plans/:id/replan', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

      const req = new NextRequest('http://localhost:3000/api/plans/plan-1/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: 'shift' }),
      });

      const res = await replanHandler(req, {
        params: Promise.resolve({ id: 'plan-1' }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });
});
