import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Migration 0005 (Reminders & Dashboard)', () => {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/0005_reminders_dashboard.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('defines all 4 phase 5 tables with PRIMARY KEYs', () => {
    expect(sql).toContain('CREATE TABLE public.push_subscriptions');
    expect(sql).toContain('CREATE TABLE public.notification_preferences');
    expect(sql).toContain('CREATE TABLE public.reminders');
    expect(sql).toContain('CREATE TABLE public.weekly_summaries');

    expect(sql).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
    expect(sql).toContain('user_id UUID PRIMARY KEY REFERENCES auth.users(id)');
  });

  it('enforces Row Level Security with default deny on all 4 tables', () => {
    expect(sql).toContain('ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;');
  });

  it('configures strict user isolation policies (auth.uid() = user_id)', () => {
    expect(sql).toContain('CREATE POLICY "Users can view their own push subscriptions"');
    expect(sql).toContain('CREATE POLICY "Users can insert their own push subscriptions"');
    expect(sql).toContain('CREATE POLICY "Users can view their own notification preferences"');
    expect(sql).toContain('CREATE POLICY "Users can update their own notification preferences"');
    expect(sql).toContain('CREATE POLICY "Users can view their own reminders"');
    expect(sql).toContain('CREATE POLICY "Users can view their own weekly summaries"');
    expect(sql).toContain('USING (auth.uid() = user_id)');
  });

  it('enforces channel and status check constraints', () => {
    expect(sql).toContain("CHECK (channel IN ('push', 'email'))");
    expect(sql).toContain("CHECK (status IN ('pending', 'sent', 'cancelled', 'skipped_quiet_hours', 'failed'))");
    expect(sql).toContain("CHECK (plan_health IN ('on_track', 'behind', 'completed'))");
  });

  it('creates performance indexes for lookups and worker queries', () => {
    expect(sql).toContain('CREATE INDEX idx_push_subscriptions_user');
    expect(sql).toContain('CREATE INDEX idx_notification_preferences_unsub');
    expect(sql).toContain('CREATE INDEX idx_reminders_user_status');
    expect(sql).toContain('CREATE INDEX idx_reminders_pending_send');
    expect(sql).toContain('CREATE INDEX idx_reminders_plan_item');
    expect(sql).toContain('CREATE INDEX idx_weekly_summaries_user_week');
  });
});
