/**
 * POST /api/attempts — Start a student attempt.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { startAttempt } from '@/modules/ai/service';

const StartAttemptSchema = z.object({
  assessmentId: z.string().uuid(),
  planItemId: z.string().uuid().optional(),
});

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
    const parsed = StartAttemptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: parsed.error.issues[0]?.message } },
        { status: 400 }
      );
    }

    const { attemptId } = await startAttempt({
      userId: user.id,
      assessmentId: parsed.data.assessmentId,
      planItemId: parsed.data.planItemId,
    });

    return NextResponse.json({ attemptId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
