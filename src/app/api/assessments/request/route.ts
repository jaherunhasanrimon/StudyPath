/**
 * POST /api/assessments/request — Request or retrieve assessment.
 * Returns 200 with assessment if cached, or 202 with jobId if queued.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  computeConfigHash,
  formatStudentAssessment,
  getOrGenerateAssessment,
} from '@/modules/ai/service';
import { enqueueAssessmentJob } from '@/modules/ai/queue';

const RequestSchema = z.object({
  videoIds: z.array(z.string()).min(1),
  kind: z.enum(['quiz', 'assignment', 'review', 'weekly_test']),
  count: z.number().int().min(1).max(20).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  language: z.enum(['bn', 'en']).default('bn'),
  planItemId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: parsed.error.issues[0]?.message } },
        { status: 400 }
      );
    }

    const { videoIds, kind, count, difficulty, language, planItemId } = parsed.data;
    const finalCount = count || (kind === 'quiz' ? 5 : 4);
    const configHash = computeConfigHash({
      videoIds,
      kind,
      count: finalCount,
      difficulty,
      language,
    });

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if assessment already exists in DB
    const { data: cachedAssessment } = await supabase
      .from('assessments')
      .select('*, questions(*)')
      .eq('config_hash', configHash)
      .eq('status', 'published')
      .maybeSingle();

    if (cachedAssessment && cachedAssessment.questions?.length > 0) {
      const studentAssessment = formatStudentAssessment(
        cachedAssessment,
        cachedAssessment.questions
      );
      return NextResponse.json({
        status: 'ready',
        assessment: studentAssessment,
      });
    }

    // In test environment or if immediate generation is configured, generate directly
    if (process.env.NODE_ENV === 'test') {
      const directAssessment = await getOrGenerateAssessment({
        videoIds,
        kind,
        count: finalCount,
        difficulty,
        language,
        userId: user?.id,
        planItemId,
      });
      return NextResponse.json({
        status: 'ready',
        assessment: directAssessment,
      });
    }

    // Otherwise, enqueue background job and return 202
    const { jobId } = await enqueueAssessmentJob({
      videoIds,
      kind,
      count: finalCount,
      difficulty,
      language,
      userId: user?.id,
      planItemId,
    });

    return NextResponse.json(
      {
        status: 'queued',
        jobId,
        pollUrl: `/api/assessments/jobs/${jobId}`,
      },
      { status: 202 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
