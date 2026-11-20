/**
 * Test that RLS is enabled on every table in the public schema.
 * This runs against the migration SQL file, not a live database.
 * Phase 0: parse the migration file to verify every CREATE TABLE
 * has a matching ALTER TABLE ... ENABLE ROW LEVEL SECURITY.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('RLS enabled on all tables', () => {
  it('every CREATE TABLE in migration 0001 has ENABLE ROW LEVEL SECURITY', () => {
    const migrationPath = join(process.cwd(), 'supabase/migrations/0001_foundation.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // Extract all table names from CREATE TABLE statements
    const createTableRegex = /CREATE TABLE\s+(?:public\.)?(\w+)/gi;
    const rlsRegex = /ALTER TABLE\s+(?:public\.)?(\w+)\s+ENABLE ROW LEVEL SECURITY/gi;

    const tables: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = createTableRegex.exec(sql)) !== null) {
      tables.push(match[1]);
    }

    const rlsTables: string[] = [];
    while ((match = rlsRegex.exec(sql)) !== null) {
      rlsTables.push(match[1]);
    }

    expect(tables.length).toBeGreaterThan(0);

    for (const table of tables) {
      expect(rlsTables).toContain(table);
    }
  });

  it('migration includes the expected Phase 0 tables', () => {
    const migrationPath = join(process.cwd(), 'supabase/migrations/0001_foundation.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    const expectedTables = [
      'profiles',
      'usage_counters',
      'jobs',
      'ai_calls',
      'events',
      'audit_logs',
    ];

    for (const table of expectedTables) {
      expect(sql).toContain(`CREATE TABLE public.${table}`);
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it('profiles table has a trigger for auto-creation on sign-up', () => {
    const migrationPath = join(process.cwd(), 'supabase/migrations/0001_foundation.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('handle_new_user');
    expect(sql).toContain('AFTER INSERT ON auth.users');
  });
});
