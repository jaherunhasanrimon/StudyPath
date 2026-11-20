/**
 * POST /api/reports — File student issue report on a question or plan item.
 * Automatically increments report_count on question (hidden at 3).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';

const ReportSchema = z.object({
  questionId: z.string().uuid().optional(),
  planItemId: z.string().uuid().optional(),
  reason: z.enum([
    'incorrect_answer',
    'confusing_stem',
    'wrong_timestamp',
    'offensive_content',
    'broken_formatting',
    'other',
  ]),
  details: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json();
    const parsed = ReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: parsed.error.issues[0]?.message } },
        { status: 400 }
      );
    }

    const { questionId, planItemId, reason, details } = parsed.data;

    // 1. Insert report record
    const { error: insertError } = await supabase.from('reports').insert({
      user_id: user?.id || null,
      question_id: questionId || null,
      plan_item_id: planItemId || null,
      reason,
      details: details || null,
    });

    if (insertError) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: insertError.message } },
        { status: 500 }
      );
    }

    // 2. If report is on a question, increment report_count
    if (questionId) {
      const { data: q } = await supabase
        .from('questions')
        .select('report_count')
        .eq('id', questionId)
        .single();

      if (q) {
        const nextCount = (q.report_count || 0) + 1;
        await supabase
          .from('questions')
          .update({ report_count: nextCount })
          .eq('id', questionId);
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
