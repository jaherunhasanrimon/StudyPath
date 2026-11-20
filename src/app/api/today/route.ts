/**
 * GET /api/today — Fetch items for Today screen (primary action, overdue, next 3).
 * Governed by docs/architecture.md §10 and §13.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getTodayItems } from '@/modules/plans/service';
import { APP_CONFIG } from '@/lib/config';

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date') || undefined;
    const timezoneParam = searchParams.get('timezone') || APP_CONFIG.DEFAULT_TIMEZONE;

    const todayData = await getTodayItems(supabase, user.id, dateParam, timezoneParam);
    return NextResponse.json(todayData, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch today items';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
