/**
 * POST /api/progress — Save throttled watch progress and mark complete when >= 90%.
 * Governed by docs/architecture.md §6.5 and §10.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { WatchProgressSchema } from '@/modules/plans/schema';
import { saveWatchProgress } from '@/modules/plans/service';

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
