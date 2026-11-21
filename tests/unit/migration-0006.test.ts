import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Migration 0006 (Compliance and Guardian Consent)', () => {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/0006_compliance_and_consent.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('defines guardian_consents table with UUID PRIMARY KEY and cascade delete on student_id', () => {
    expect(sql).toContain('CREATE TABLE public.guardian_consents');
    expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
    expect(sql).toContain('student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE');
  });

  it('enforces Row Level Security with default deny', () => {
    expect(sql).toContain('ALTER TABLE public.guardian_consents ENABLE ROW LEVEL SECURITY;');
  });

  it('configures strict student isolation policies (auth.uid() = student_id)', () => {
    expect(sql).toContain('CREATE POLICY "Students can view their own guardian consents"');
    expect(sql).toContain('CREATE POLICY "Students can insert their own guardian consents"');
    expect(sql).toContain('CREATE POLICY "Students can update their own guardian consents"');
    expect(sql).toContain('USING (auth.uid() = student_id)');
  });

  it('enforces status check constraints for guardian consent lifecycle', () => {
    expect(sql).toContain("CHECK (status IN ('pending', 'granted', 'revoked', 'expired'))");
  });

  it('creates performance indexes for student_id, token, and status lookups', () => {
    expect(sql).toContain('CREATE INDEX idx_guardian_consents_student ON public.guardian_consents(student_id);');
    expect(sql).toContain('CREATE INDEX idx_guardian_consents_token ON public.guardian_consents(token);');
    expect(sql).toContain('CREATE INDEX idx_guardian_consents_status ON public.guardian_consents(status);');
  });

  it('defines purge_expired_ai_calls_and_consents for 30-day retention and token expiry', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.purge_expired_ai_calls_and_consents()');
    expect(sql).toContain("WHERE created_at < NOW() - INTERVAL '30 days'");
    expect(sql).toContain("SET status = 'expired'");
  });
});
