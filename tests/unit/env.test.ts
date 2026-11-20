/**
 * Unit tests for lib/env.ts — environment validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('provides defaults for optional variables', async () => {
    // Set minimal env
    vi.stubEnv('APP_URL', 'http://localhost:3000');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    const { env } = await import('@/lib/env');
    expect(env.AI_DAILY_BUDGET_USD).toBe(5);
    expect(env.FREE_ACTIVE_PLANS).toBe(3);
    expect(env.FREE_AI_GENERATIONS_PER_MONTH).toBe(30);
    expect(env.MAX_PLAYLIST_VIDEOS).toBe(300);
  });

  it('coerces string numbers to numbers', async () => {
    vi.stubEnv('AI_DAILY_BUDGET_USD', '10');
    vi.stubEnv('FREE_ACTIVE_PLANS', '5');

    const { env } = await import('@/lib/env');
    expect(env.AI_DAILY_BUDGET_USD).toBe(10);
    expect(env.FREE_ACTIVE_PLANS).toBe(5);
  });
});
