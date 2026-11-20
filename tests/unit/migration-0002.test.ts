/**
 * Test that RLS is enabled on every table in migration 0002_youtube.sql.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Migration 0002 (YouTube tables) RLS & structural checks', () => {
  const migrationPath = join(process.cwd(), 'supabase/migrations/0002_youtube.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  it('contains the 3 required Phase 1 tables', () => {
    const expectedTables = ['playlists', 'videos', 'playlist_items'];
    for (const table of expectedTables) {
      expect(sql).toContain(`CREATE TABLE public.${table}`);
    }
  });

  it('enables ROW LEVEL SECURITY on every table', () => {
    const expectedTables = ['playlists', 'videos', 'playlist_items'];
    for (const table of expectedTables) {
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it('has authenticated read policies for all 3 tables', () => {
    expect(sql).toContain('CREATE POLICY "Authenticated users can read playlists"');
    expect(sql).toContain('CREATE POLICY "Authenticated users can read videos"');
    expect(sql).toContain('CREATE POLICY "Authenticated users can read playlist_items"');
  });

  it('enforces 25-day metadata expiration per the 30-day policy rule', () => {
    expect(sql).toContain("INTERVAL '25 days'");
  });
});
