/**
 * POST /api/attempts/:id/submit — Submit answers and grade attempt on server.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { gradeAttempt } from '@/modules/ai/service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const SubmitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      response: z.object({
        selectedIndex: z.number().int().optional(),
        value: z.union([z.number(), z.string(), z.boolean()]).optional(),
        selfScore: z.number().optional(),
      }),
      timeMs: z.number().int().nonnegative().optional(),
      hintsUsed: z.number().int().nonnegative().optional(),
    })
  ),
});

export async function POST(req: NextRequest, { params }: RouteContext) {
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

    const body = await req.json();
    const parsed = SubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: parsed.error.issues[0]?.message } },
        { status: 400 }
      );
    }

    const result = await gradeAttempt({
      attemptId: id,
      userId: user.id,
      answers: parsed.data.answers,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
