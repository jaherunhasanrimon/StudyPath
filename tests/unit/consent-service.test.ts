/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import {
  isMinor,
  checkMinorAccess,
  createConsentRequest,
  verifyConsentToken,
  recordConsentDecision,
} from '@/modules/consent/service';

describe('Consent & Minor Protection Service (architecture.md §12 & phases.md §1 Phase 6)', () => {
  describe('isMinor pure function', () => {
    it('correctly identifies minors (< 18) based on birth year and current year', () => {
      // 2026 - 2009 = 17 -> minor
      expect(isMinor(2009, 2026)).toBe(true);
      // 2026 - 2012 = 14 -> minor
      expect(isMinor(2012, 2026)).toBe(true);
      // 2026 - 2008 = 18 -> adult
      expect(isMinor(2008, 2026)).toBe(false);
      // 2026 - 2000 = 26 -> adult
      expect(isMinor(2000, 2026)).toBe(false);
    });

    it('returns false for null or undefined birth year', () => {
      expect(isMinor(null, 2026)).toBe(false);
      expect(isMinor(undefined, 2026)).toBe(false);
    });
  });

  describe('checkMinorAccess with Supabase', () => {
    it('allows full access to adult students (18+)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { birth_year: 2000 },
                error: null,
              }),
            }),
          }),
        }),
      } as any;

      const result = await checkMinorAccess(mockSupabase, 'user-adult', 2026);
      expect(result.isMinor).toBe(false);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('adult');
    });

    it('blocks minor students who have no guardian consent record', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { birth_year: 2010 },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'guardian_consents') {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: null,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        },
      } as any;

      const result = await checkMinorAccess(mockSupabase, 'user-minor', 2026);
      expect(result.isMinor).toBe(true);
      expect(result.allowed).toBe(false);
      expect(result.consentGranted).toBe(false);
      expect(result.reason).toBe('guardian_consent_required');
    });

    it('allows minor students whose guardian consent is granted', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { birth_year: 2010 },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'guardian_consents') {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          id: 'consent-1',
                          student_id: 'user-minor',
                          guardian_email: 'guardian@example.com',
                          status: 'granted',
                          token_expires_at: new Date(Date.now() + 86400000).toISOString(),
                          granted_at: new Date().toISOString(),
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        },
      } as any;

      const result = await checkMinorAccess(mockSupabase, 'user-minor', 2026);
      expect(result.isMinor).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.consentGranted).toBe(true);
      expect(result.reason).toBe('consent_granted');
    });

    it('blocks minor students whose guardian consent is revoked', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { birth_year: 2010 },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'guardian_consents') {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          id: 'consent-1',
                          student_id: 'user-minor',
                          guardian_email: 'guardian@example.com',
                          status: 'revoked',
                          token_expires_at: new Date(Date.now() + 86400000).toISOString(),
                          revoked_at: new Date().toISOString(),
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        },
      } as any;

      const result = await checkMinorAccess(mockSupabase, 'user-minor', 2026);
      expect(result.isMinor).toBe(true);
      expect(result.allowed).toBe(false);
      expect(result.consentGranted).toBe(false);
      expect(result.reason).toBe('consent_revoked');
    });

    it('blocks minor students whose consent token has expired', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { birth_year: 2010 },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'guardian_consents') {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          id: 'consent-1',
                          student_id: 'user-minor',
                          guardian_email: 'guardian@example.com',
                          status: 'pending',
                          token_expires_at: new Date(Date.now() - 86400000).toISOString(), // expired yesterday
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {} as any;
        },
      } as any;

      const result = await checkMinorAccess(mockSupabase, 'user-minor', 2026);
      expect(result.isMinor).toBe(true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('consent_expired');
    });
  });

  describe('createConsentRequest', () => {
    it('validates guardian email format', async () => {
      const mockSupabase = {} as any;
      const result = await createConsentRequest(mockSupabase, {
        student_id: 'stud-1',
        guardian_email: 'invalid-email',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Valid guardian email is required');
    });

    it('creates a consent request with 7-day expiration', async () => {
      let insertedPayload: any = null;
      const mockSupabase = {
        from: () => ({
          insert: (payload: any) => {
            insertedPayload = payload;
            return {
              select: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'consent-id-123',
                    ...payload,
                  },
                  error: null,
                }),
              }),
            };
          },
        }),
      } as any;

      const result = await createConsentRequest(mockSupabase, {
        student_id: 'stud-1',
        guardian_email: 'parent@example.com',
      });

      expect(result.success).toBe(true);
      expect(insertedPayload.guardian_email).toBe('parent@example.com');
      expect(insertedPayload.status).toBe('pending');
      expect(new Date(insertedPayload.token_expires_at).getTime()).toBeGreaterThan(Date.now() + 6 * 86400000);
    });
  });

  describe('verifyConsentToken', () => {
    it('verifies a valid active consent token', async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'consent-token-1',
                  status: 'pending',
                  token_expires_at: new Date(Date.now() + 86400000).toISOString(),
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any;

      const verified = await verifyConsentToken(mockSupabase, 'test-token');
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe('consent-token-1');
      expect(verified?.status).toBe('pending');
    });
  });

  describe('recordConsentDecision', () => {
    it('records a grant decision successfully', async () => {
      let updatedPayload: any = null;
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'consent-123',
                  status: 'pending',
                  token_expires_at: new Date(Date.now() + 86400000).toISOString(),
                },
                error: null,
              }),
            }),
          }),
          update: (payload: any) => {
            updatedPayload = payload;
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          },
        }),
      } as any;

      const result = await recordConsentDecision(mockSupabase, {
        token: 'valid-token',
        decision: 'grant',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('granted');
      expect(updatedPayload.status).toBe('granted');
      expect(updatedPayload.granted_at).toBeDefined();
    });

    it('records a revoke decision successfully', async () => {
      let updatedPayload: any = null;
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'consent-123',
                  status: 'granted',
                  token_expires_at: new Date(Date.now() + 86400000).toISOString(),
                },
                error: null,
              }),
            }),
          }),
          update: (payload: any) => {
            updatedPayload = payload;
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          },
        }),
      } as any;

      const result = await recordConsentDecision(mockSupabase, {
        token: 'valid-token',
        decision: 'revoke',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('revoked');
      expect(updatedPayload.status).toBe('revoked');
      expect(updatedPayload.revoked_at).toBeDefined();
    });
  });
});
