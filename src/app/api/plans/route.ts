/**
 * POST /api/plans — Save a new study plan.
 * GET /api/plans  — List user's study plans.
 * Governed by docs/architecture.md §10.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CreatePlanSchema } from '@/modules/plans/schema';
import { createStudyPlan, getUserStudyPlans, PlanLimitError } from '@/modules/plans/service';

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
    const parsed = CreatePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message || 'Invalid plan data',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const planWithItems = await createStudyPlan(supabase, user.id, parsed.data);
    return NextResponse.json({ success: true, plan: planWithItems }, { status: 201 });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json(
        { error: { code: 'LIMIT_EXCEEDED', message: err.message } },
        { status: 403 }
      );
    }

    const message = err instanceof Error ? err.message : 'Failed to save plan';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}

export async function GET() {
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

    const plans = await getUserStudyPlans(supabase, user.id);
    return NextResponse.json({ plans }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch plans';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
