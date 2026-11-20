/**
 * /api/progress
 * POST: Save throttled watch progress and mark complete when >= 90% (Phase 3).
 * GET: Computes statistical dashboard metrics for student progress (Phase 5).
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase';
import { WatchProgressSchema } from '@/modules/plans/schema';
import { saveWatchProgress } from '@/modules/plans/service';
import {
  calculateAdherence,
  calculateWeeklyMinutes,
  calculateQuizScoreTrend,
  calculateUpcomingWorkload,
  determinePlanHealth,
  calculateStreak,
  PlanItemProgress,
  UpcomingItemRecord,
} from '@/modules/learning/progress';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    // Check for dishari-test-user cookie (used in Playwright tests)
    const cookieStore = await cookies();
    const testCookie = cookieStore.get('dishari-test-user');
    if (!user && testCookie?.value) {
      user = { id: testCookie.value, email: 'test@example.com' } as unknown as User;
    }

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const todayYmd = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    // Fetch user preferences and timezone
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('streak_enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .maybeSingle();

    const timezone = profile?.timezone || 'Asia/Dhaka';
    const streakEnabled = pref?.streak_enabled ?? false;

    // 1. Fetch all plan items for the student
    const { data: rawItems } = await supabase
      .from('plan_items')
      .select('id, status, scheduled_date, completed_at, duration_sec, type')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true });

    const items = rawItems || [];

    // 2. Fetch watch progress sessions
    const { data: rawProgress } = await supabase
      .from('watch_progress')
      .select('seconds_watched, updated_at')
      .eq('user_id', user.id);

    const progress = rawProgress || [];

    // 3. Fetch completed quiz attempts
    const { data: rawAttempts } = await supabase
      .from('attempts')
      .select('score, max_score, submitted_at')
      .eq('user_id', user.id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: true });

    const attempts = rawAttempts || [];

    // Map to domain interfaces
    const planItemsMapped: PlanItemProgress[] = items.map((i) => ({
      id: i.id,
      status: i.status as PlanItemProgress['status'],
      scheduledDate: i.scheduled_date,
      completedAt: i.completed_at,
    }));

    const sessionsMapped = progress.map((p) => ({
      durationSeconds: p.seconds_watched || 0,
      studiedAt: p.updated_at,
    }));

    const attemptsMapped = attempts.map((a) => ({
      score: a.score || 0,
      maxScore: a.max_score || 10,
      submittedAt: a.submitted_at,
    }));

    const upcomingItemsMapped: UpcomingItemRecord[] = items
      .filter((i) => i.status === 'pending' && i.scheduled_date >= todayYmd)
      .map((i) => ({
        type: (i.type || 'video') as UpcomingItemRecord['type'],
        date: i.scheduled_date,
        durationSeconds: i.duration_sec || 1800,
      }));

    // Extract unique active completed dates for streak
    const activeDates = Array.from(
      new Set(
        items
          .filter((i) => i.status === 'completed' && i.completed_at)
          .map((i) => i.completed_at!.split('T')[0])
      )
    );

    // Run pure statistical calculations
    const adherence = calculateAdherence(planItemsMapped);
    const weeklyMinutes = calculateWeeklyMinutes(sessionsMapped, nowIso, 120, timezone);
    const quizTrend = calculateQuizScoreTrend(attemptsMapped);
    const upcomingWorkload = calculateUpcomingWorkload(upcomingItemsMapped, todayYmd, timezone);
    const overdueCount = items.filter((i) => i.status === 'missed').length;
    const planHealth = determinePlanHealth(adherence.rate, overdueCount);
    const streak = calculateStreak(activeDates, todayYmd, timezone);

    return NextResponse.json({
      adherence,
      weeklyMinutes,
      quizTrend,
      upcomingWorkload,
      planHealth,
      streak,
      streakEnabled,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = WatchProgressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message || 'Invalid progress data',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const progress = await saveWatchProgress(supabase, user.id, parsed.data);
    return NextResponse.json({ success: true, progress }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save progress';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
