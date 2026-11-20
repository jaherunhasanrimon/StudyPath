/**
 * GET /api/plans/:id — Fetch a single plan with items and watch progress.
 * Governed by docs/architecture.md §10.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getPlanWithItems } from '@/modules/plans/service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
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

    const plan = await getPlanWithItems(supabase, user.id, id);
    if (!plan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Study plan not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ plan }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch plan';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
