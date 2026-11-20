/**
 * Unit tests for POST /api/playlists/resolve endpoint.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/playlists/resolve/route';
import { NextRequest } from 'next/server';
import { resetRateLimitStore } from '@/lib/rate-limit';
import { clearMemoryCache } from '@/modules/youtube/import';

describe('POST /api/playlists/resolve', () => {
  beforeEach(() => {
    resetRateLimitStore();
    clearMemoryCache();
  });

  it('returns 400 when body is empty or invalid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/playlists/resolve', {
      method: 'POST',
      body: 'invalid-json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('INVALID_JSON');
  });

  it('returns 400 when url field is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/playlists/resolve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('EMPTY_INPUT');
  });

  it('returns 400 for auto-generated mix URLs', async () => {
    const req = new NextRequest('http://localhost:3000/api/playlists/resolve', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://www.youtube.com/playlist?list=RD1234567890' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('MIX_NOT_SUPPORTED');
  });

  it('returns 429 when rate limit of 10 requests is exceeded', async () => {
    // Dispatch 10 valid requests
    for (let i = 0; i < 10; i++) {
      const req = new NextRequest('http://localhost:3000/api/playlists/resolve', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.50' },
        body: JSON.stringify({ url: 'invalid-url' }),
      });
      await POST(req);
    }

    // 11th request must be rejected with 429
    const req11 = new NextRequest('http://localhost:3000/api/playlists/resolve', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.50' },
      body: JSON.stringify({ url: 'https://youtube.com/playlist?list=PL1234567890' }),
    });

    const res = await POST(req11);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe('RATE_LIMITED');
  });
});
