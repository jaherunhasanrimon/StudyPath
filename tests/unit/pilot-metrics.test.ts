import { describe, it, expect, vi } from 'vitest';
import { computePilotMetrics } from '@/modules/admin/metrics';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Pilot Metrics & Cohort Engine', () => {
  it('computes accurate retention, adherence, and spend on seeded cohort data', async () => {
    const baseDate = new Date('2026-03-01T00:00:00Z');

    const mockStudents = [
      { id: 's-1', created_at: '2026-01-01T00:00:00Z', role: 'student' },
      { id: 's-2', created_at: '2026-01-01T00:00:00Z', role: 'student' },
      { id: 's-3', created_at: '2026-01-01T00:00:00Z', role: 'student' },
      { id: 's-4', created_at: '2026-01-01T00:00:00Z', role: 'student' },
      { id: 's-5', created_at: '2026-01-01T00:00:00Z', role: 'student' },
    ];

    // Seed activities across 8 weeks (Day 0 to Day 56)
    const mockPlanItems = [
      // Week 1 activities for all 5 students
      { id: 'p1', type: 'class', status: 'completed', completed_at: '2026-01-03T10:00:00Z', study_plans: { user_id: 's-1' } },
      { id: 'p2', type: 'class', status: 'completed', completed_at: '2026-01-03T10:00:00Z', study_plans: { user_id: 's-2' } },
      { id: 'p3', type: 'class', status: 'completed', completed_at: '2026-01-03T10:00:00Z', study_plans: { user_id: 's-3' } },
      { id: 'p4', type: 'class', status: 'completed', completed_at: '2026-01-03T10:00:00Z', study_plans: { user_id: 's-4' } },
      { id: 'p5', type: 'class', status: 'completed', completed_at: '2026-01-03T10:00:00Z', study_plans: { user_id: 's-5' } },
      // Week 4 activities for 4 students (s1, s2, s3, s4) -> 80%
      { id: 'p6', type: 'class', status: 'completed', completed_at: '2026-01-25T10:00:00Z', study_plans: { user_id: 's-1' } },
      { id: 'p7', type: 'class', status: 'completed', completed_at: '2026-01-25T10:00:00Z', study_plans: { user_id: 's-2' } },
      { id: 'p8', type: 'class', status: 'completed', completed_at: '2026-01-25T10:00:00Z', study_plans: { user_id: 's-3' } },
      { id: 'p9', type: 'class', status: 'completed', completed_at: '2026-01-25T10:00:00Z', study_plans: { user_id: 's-4' } },
      // Week 8 activities for 3 students (s1, s2, s3) -> 60%
      { id: 'p10', type: 'class', status: 'completed', completed_at: '2026-02-22T10:00:00Z', study_plans: { user_id: 's-1' } },
      { id: 'p11', type: 'class', status: 'completed', completed_at: '2026-02-22T10:00:00Z', study_plans: { user_id: 's-2' } },
      { id: 'p12', type: 'class', status: 'completed', completed_at: '2026-02-22T10:00:00Z', study_plans: { user_id: 's-3' } },
      // Quizzes: 4 scheduled, 4 completed
      { id: 'q1', type: 'quiz', status: 'completed', completed_at: '2026-01-05T10:00:00Z', study_plans: { user_id: 's-1' } },
      { id: 'q2', type: 'quiz', status: 'completed', completed_at: '2026-01-05T10:00:00Z', study_plans: { user_id: 's-2' } },
      { id: 'q3', type: 'quiz', status: 'completed', completed_at: '2026-01-05T10:00:00Z', study_plans: { user_id: 's-3' } },
      { id: 'q4', type: 'quiz', status: 'completed', completed_at: '2026-01-05T10:00:00Z', study_plans: { user_id: 's-4' } },
    ];

    const mockAiCalls = [
      { cost_usd_est: 0.0125 },
      { cost_usd_est: 0.0075 },
    ];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({ data: mockStudents, error: null }),
            }),
          };
        }
        if (table === 'plan_items') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: mockPlanItems, error: null }),
            }),
          };
        }
        if (table === 'ai_calls') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockAiCalls, error: null }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const metrics = await computePilotMetrics(mockSupabase, baseDate);

    expect(metrics.totalStudents).toBe(5);
    expect(metrics.retention.week1Rate).toBe(100);
    expect(metrics.retention.week4Rate).toBe(80);
    expect(metrics.retention.week8Rate).toBe(60);
    expect(metrics.overallAdherenceRate).toBe(100);
    expect(metrics.quizAttemptRate).toBe(100);
    expect(metrics.totalAiCostUsd).toBe(0.02);
  });
});
