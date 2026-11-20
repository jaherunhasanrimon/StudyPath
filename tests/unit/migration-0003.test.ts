/**
 * Test that RLS and constraints are properly configured in migration 0003_learning_loop.sql.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Migration 0003 (Learning loop tables) RLS & structural checks', () => {
  const migrationPath = join(process.cwd(), 'supabase/migrations/0003_learning_loop.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  const expectedTables = [
    'user_playlists',
    'study_plans',
    'plan_items',
    'watch_progress',
    'notes',
  ];

  it('contains all 5 required Phase 3 tables', () => {
    for (const table of expectedTables) {
      expect(sql).toContain(`CREATE TABLE public.${table}`);
    }
  });

  it('enables ROW LEVEL SECURITY on all 5 tables', () => {
    for (const table of expectedTables) {
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it('has strict user-ownership RLS policies for user tables', () => {
    expect(sql).toContain('CREATE POLICY "Users can manage their own user_playlists"');
    expect(sql).toContain('CREATE POLICY "Users can manage their own study_plans"');
    expect(sql).toContain('CREATE POLICY "Users can manage their own watch_progress"');
    expect(sql).toContain('CREATE POLICY "Users can manage their own notes"');
  });

  it('has plan-ownership join RLS policy for plan_items', () => {
    expect(sql).toContain('CREATE POLICY "Users can manage plan_items belonging to their study_plans"');
    expect(sql).toContain('sp.id = plan_items.plan_id AND sp.user_id = auth.uid()');
  });

  it('does not contain any non-immutable generated columns using NOW()', () => {
    // Regression check for PostgreSQL error 42P17
    const generatedMatches = sql.match(/GENERATED ALWAYS AS.*NOW\(\)/gi);
    expect(generatedMatches).toBeNull();
  });

  it('has correct composite primary key on watch_progress', () => {
    expect(sql).toContain('PRIMARY KEY (user_id, video_id)');
  });

  it('creates performance indexes on user and relation foreign keys', () => {
    expect(sql).toContain('CREATE INDEX idx_user_playlists_user');
    expect(sql).toContain('CREATE INDEX idx_study_plans_user_status');
    expect(sql).toContain('CREATE INDEX idx_plan_items_plan_seq');
    expect(sql).toContain('CREATE INDEX idx_plan_items_plan_start');
    expect(sql).toContain('CREATE INDEX idx_watch_progress_user');
    expect(sql).toContain('CREATE INDEX idx_notes_user_video');
  });
});
