/**
 * GET /api/class/:itemId — Fetch item details, video progress, notes, and next item.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { PlanItemRow, WatchProgressRow, NoteRow } from '@/modules/plans/types';

interface RouteContext {
  params: Promise<{ itemId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { itemId } = await params;
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

    const { data: item, error: itemError } = await supabase
      .from('plan_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Item not found' } },
        { status: 404 }
      );
    }

    const planItem = item as PlanItemRow;
    const primaryVideoId = planItem.video_ids[0] || '';

    // Watch progress
    const { data: progress } = await supabase
      .from('watch_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('video_id', primaryVideoId)
      .maybeSingle();

    // Notes
    const { data: note } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('video_id', primaryVideoId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Next item in plan
    const { data: nextItem } = await supabase
      .from('plan_items')
      .select('id')
      .eq('plan_id', planItem.plan_id)
      .gt('seq', planItem.seq)
      .order('seq', { ascending: true })
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      {
        item: planItem,
        planId: planItem.plan_id,
        progress: (progress as WatchProgressRow) || null,
        note: (note as NoteRow)?.body || null,
        nextItemId: nextItem ? nextItem.id : null,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch class';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
