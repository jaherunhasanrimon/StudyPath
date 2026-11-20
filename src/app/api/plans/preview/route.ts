/**
 * src/app/api/plans/preview/route.ts
 *
 * Route handler for generating study plan previews.
 * POST /api/plans/preview
 *
 * Validates inputs with Zod, executes the pure scheduler, and returns PlanResult.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VideoSchema, PrefsSchema } from '@/modules/scheduler/schema';
import { buildPlan } from '@/modules/scheduler';

const PreviewRequestSchema = z.object({
  videos: z.array(VideoSchema).min(1, 'At least one video is required to generate a plan'),
  prefs: PrefsSchema,
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = PreviewRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message || 'Invalid plan request parameters',
          errors: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { videos, prefs } = parsed.data;
    const plan = buildPlan(videos, prefs);

    return NextResponse.json(plan, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate plan preview',
      },
      { status: 500 }
    );
  }
}
