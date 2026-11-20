import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as subscribePost } from '@/app/api/notifications/subscribe/route';
import { POST as unsubscribePost, GET as unsubscribeGet } from '@/app/api/notifications/unsubscribe/route';
import { GET as preferencesGet, PUT as preferencesPut } from '@/app/api/notifications/preferences/route';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockUser: any = { id: 'test-user-123', email: 'test@example.com' };

vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'push_subscriptions') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      if (table === 'notification_preferences') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  user_id: 'test-user-123',
                  push_enabled: true,
                  email_enabled: true,
                  lead_minutes: 30,
                  quiet_hours_start: '22:00',
                  quiet_hours_end: '07:00',
                  streak_enabled: false,
                },
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: [{ user_id: 'test-user-123' }], error: null }),
            }),
          }),
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  push_enabled: true,
                  email_enabled: false,
                  lead_minutes: 15,
                  quiet_hours_start: '23:00',
                  quiet_hours_end: '06:00',
                  streak_enabled: true,
                },
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

describe('Notification API Endpoints (architecture.md §11 & phases.md §1)', () => {
  beforeEach(() => {
    mockUser = { id: 'test-user-123', email: 'test@example.com' };
  });

  it('subscribes browser endpoint to web push', async () => {
    const req = new NextRequest('http://localhost:3000/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: 'https://fcm.googleapis.com/fcm/send/sub-123',
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
      }),
    });

    const res = await subscribePost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscribed).toBe(true);
  });

  it('rejects subscribe request with invalid schema', async () => {
    const req = new NextRequest('http://localhost:3000/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'invalid-url' }),
    });

    const res = await subscribePost(req);
    expect(res.status).toBe(400);
  });

  it('unsubscribes push endpoint successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/notifications/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: 'https://fcm.googleapis.com/fcm/send/sub-123',
      }),
    });

    const res = await unsubscribePost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unsubscribed).toBe(true);
  });

  it('handles public one-click unsubscribe via GET with token', async () => {
    const req = new NextRequest('http://localhost:3000/api/notifications/unsubscribe?token=valid-token');
    const res = await unsubscribeGet(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('আনসাবস্ক্রাইব সম্পন্ন');
  });

  it('retrieves and updates notification preferences', async () => {
    const getRes = await preferencesGet();
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.leadMinutes).toBe(30);

    const putReq = new NextRequest('http://localhost:3000/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({
        emailEnabled: false,
        leadMinutes: 15,
        quietHoursStart: '23:00',
        quietHoursEnd: '06:00',
        streakEnabled: true,
      }),
    });

    const putRes = await preferencesPut(putReq);
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody.preferences.streakEnabled).toBe(true);
    expect(putBody.preferences.leadMinutes).toBe(15);
  });
});
