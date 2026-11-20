import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Migration 0004 (Assessments & Questions)', () => {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/0004_assessments.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('defines all 6 phase 4 tables with PRIMARY KEYs', () => {
    expect(sql).toContain('CREATE TABLE public.video_insights');
    expect(sql).toContain('CREATE TABLE public.assessments');
    expect(sql).toContain('CREATE TABLE public.questions');
    expect(sql).toContain('CREATE TABLE public.attempts');
    expect(sql).toContain('CREATE TABLE public.attempt_answers');
    expect(sql).toContain('CREATE TABLE public.reports');

    expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
    expect(sql).toContain('PRIMARY KEY (attempt_id, question_id)');
  });

  it('enforces Row Level Security on all 6 tables', () => {
    expect(sql).toContain('ALTER TABLE public.video_insights ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;');
  });

  it('configures strict user isolation for attempts and answers', () => {
    expect(sql).toContain('CREATE POLICY "Users can manage their own attempts"');
    expect(sql).toContain('auth.uid() = user_id');
    expect(sql).toContain('CREATE POLICY "Users can manage attempt_answers for their attempts"');
    expect(sql).toContain('WHERE a.id = attempt_answers.attempt_id AND a.user_id = auth.uid()');
  });

  it('restricts questions to published assessments and hides heavily reported questions', () => {
    expect(sql).toContain('CREATE POLICY "Authenticated users can read questions of published assessments"');
    expect(sql).toContain('report_count < 3');
    expect(sql).toContain("status = 'published'");
  });

  it('creates performance indexes for lookups and joins', () => {
    expect(sql).toContain('CREATE INDEX idx_video_insights_lookup');
    expect(sql).toContain('CREATE INDEX idx_assessments_hash');
    expect(sql).toContain('CREATE INDEX idx_questions_assessment_pos');
    expect(sql).toContain('CREATE INDEX idx_attempts_user');
    expect(sql).toContain('CREATE INDEX idx_reports_target');
  });
});
