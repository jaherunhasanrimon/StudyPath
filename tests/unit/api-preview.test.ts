/**
 * tests/unit/api-preview.test.ts
 *
 * Unit tests for POST /api/plans/preview route handler.
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/plans/preview/route';

describe('POST /api/plans/preview Route Handler', () => {
  it('returns 200 with PlanResult for valid videos and prefs', async () => {
    const validBody = {
      videos: [
        {
          id: 'v1',
          title: 'Class 1',
          durationSec: 3600,
          position: 0,
          available: true,
          embeddable: true,
        },
      ],
      prefs: {
        startDate: '2026-11-21',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/plans/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.items).toHaveLength(1);
    expect(data.summary.classes).toBe(1);
    expect(data.feasibility.status).toBeDefined();
    expect(data.inputHash).toBeDefined();
  });

  it('returns 400 with VALIDATION_ERROR when videos array is empty', async () => {
    const invalidBody = {
      videos: [],
      prefs: {
        startDate: '2026-11-21',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/plans/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when startDate is missing', async () => {
    const invalidBody = {
      videos: [
        {
          id: 'v1',
          title: 'Class 1',
          durationSec: 3600,
          position: 0,
        },
      ],
      prefs: {},
    };

    const req = new NextRequest('http://localhost:3000/api/plans/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe('VALIDATION_ERROR');
  });
});
