import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Migration 0007 (Pilot Readiness & Admin Moderation)', () => {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/0007_pilot_readiness.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('adds is_hidden column and index on questions table', () => {
    expect(sql).toContain('ALTER TABLE public.questions');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE');
    expect(sql).toContain('idx_questions_hidden_report');
  });

  it('updates public questions select policy to filter out hidden questions (is_hidden = FALSE)', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "Authenticated users can read questions of published assessments"');
    expect(sql).toContain('AND is_hidden = FALSE');
    expect(sql).toContain('AND report_count < 3');
  });

  it('defines creator_opt_outs table with channel_id unique constraint and status check', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.creator_opt_outs');
    expect(sql).toContain('channel_id TEXT NOT NULL UNIQUE');
    expect(sql).toContain("CHECK (status IN ('active', 'revoked'))");
    expect(sql).toContain('ALTER TABLE public.creator_opt_outs ENABLE ROW LEVEL SECURITY;');
  });

  it('defines feedback table with user_id, category, and status checks', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.feedback');
    expect(sql).toContain("CHECK (category IN ('bug', 'question_error', 'suggestion', 'praise'))");
    expect(sql).toContain("CHECK (status IN ('new', 'investigating', 'resolved', 'closed'))");
    expect(sql).toContain('ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;');
  });

  it('defines is_admin helper function checking profiles.role = admin', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)');
    expect(sql).toContain("p.role = 'admin'");
  });

  it('defines admin-only management policies across questions, opt-outs, feedback, and reports', () => {
    expect(sql).toContain('CREATE POLICY "Admins can manage all questions"');
    expect(sql).toContain('CREATE POLICY "Admins can manage creator opt-outs"');
    expect(sql).toContain('CREATE POLICY "Admins can manage all feedback"');
    expect(sql).toContain('CREATE POLICY "Admins can view and manage all reports"');
    expect(sql).toContain('USING (public.is_admin(auth.uid()))');
  });

  it('seeds default admin role for rimonhassan013@gmail.com', () => {
    expect(sql).toContain("email = 'rimonhassan013@gmail.com'");
    expect(sql).toContain("SET role = 'admin'");
  });
});
