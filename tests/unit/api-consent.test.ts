/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as requestPost } from '@/app/api/consent/request/route';
import { GET as verifyGet, POST as verifyPost } from '@/app/api/consent/verify/route';

let mockUser: any = { id: 'student-123', email: 'student@example.com' };
const mockConsentRecord: any = {
  id: 'consent-123',
  student_id: 'student-123',
  guardian_email: 'guardian@example.com',
  status: 'pending',
  token: 'valid-test-token',
  token_expires_at: new Date(Date.now() + 86400000).toISOString(),
};

vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { display_name: 'Test Student', locale: 'bn' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      };
    }),
  })),
  createAdminSupabaseClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'guardian_consents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockConsentRecord,
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { display_name: 'Test Student', locale: 'bn' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    }),
  })),
}));

vi.mock('@/modules/consent/service', () => ({
  createConsentRequest: vi.fn(async (_supabase, input) => {
    if (!input.guardian_email || !input.guardian_email.includes('@')) {
      return { success: false, error: 'Valid guardian email is required' };
    }
    return {
      success: true,
      consent: {
        id: 'new-consent-id',
        student_id: input.student_id,
        guardian_email: input.guardian_email,
        status: 'pending',
        token: 'generated-token-xyz',
        token_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
    };
  }),
  verifyConsentToken: vi.fn(async (_supabase, token) => {
    if (token === 'valid-test-token') {
      return mockConsentRecord;
    }
    return null;
  }),
  recordConsentDecision: vi.fn(async (_supabase, input) => {
    if (input.token === 'valid-test-token') {
      return {
        success: true,
        status: input.decision === 'grant' ? 'granted' : 'revoked',
      };
    }
    return { success: false, error: 'Token not found' };
  }),
}));

vi.mock('@/modules/consent/email', () => ({
  sendGuardianConsentEmail: vi.fn().mockResolvedValue({ success: true, id: 'email-sent-123' }),
}));

describe('Guardian Consent API Routes (architecture.md §12 & phases.md §1 Phase 6)', () => {
  beforeEach(() => {
    mockUser = { id: 'student-123', email: 'student@example.com' };
  });

  describe('POST /api/consent/request', () => {
    it('returns 401 when student is unauthenticated', async () => {
      mockUser = null;
      const req = new NextRequest('http://localhost:3000/api/consent/request', {
        method: 'POST',
        body: JSON.stringify({ guardian_email: 'parent@example.com' }),
      });
      const res = await requestPost(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when guardian email is missing or invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/consent/request', {
        method: 'POST',
        body: JSON.stringify({ guardian_email: 'not-an-email' }),
      });
      const res = await requestPost(req);
      expect(res.status).toBe(400);
    });

    it('creates consent request and dispatches email on valid input', async () => {
      const req = new NextRequest('http://localhost:3000/api/consent/request', {
        method: 'POST',
        body: JSON.stringify({ guardian_email: 'guardian@example.com' }),
      });
      const res = await requestPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.consent.guardian_email).toBe('guardian@example.com');
      expect(json.consent.status).toBe('pending');
    });
  });

  describe('GET /api/consent/verify', () => {
    it('returns 400 when token query param is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/consent/verify');
      const res = await verifyGet(req);
      expect(res.status).toBe(400);
    });

    it('returns 404 when token is not found', async () => {
      const req = new NextRequest('http://localhost:3000/api/consent/verify?token=unknown-token');
      const res = await verifyGet(req);
      expect(res.status).toBe(404);
    });

    it('returns consent details when token is valid', async () => {
      const req = new NextRequest('http://localhost:3000/api/consent/verify?token=valid-test-token');
      const res = await verifyGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.consent.id).toBe('consent-123');
      expect(json.consent.student_name).toBe('Test Student');
    });
  });

  describe('POST /api/consent/verify', () => {
    it('records a grant decision successfully', async () => {
      const req = new NextRequest('http://localhost:3000/api/consent/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-test-token', decision: 'grant' }),
      });
      const res = await verifyPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.status).toBe('granted');
    });

    it('records a revoke decision successfully', async () => {
      const req = new NextRequest('http://localhost:3000/api/consent/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-test-token', decision: 'revoke' }),
      });
      const res = await verifyPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.status).toBe('revoked');
    });
  });
});
