/**
 * GET /api/assessments/:id — Retrieve student-safe assessment (answer keys stripped).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAssessmentForStudent } from '@/modules/ai/service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const assessment = await getAssessmentForStudent(id);

    if (!assessment) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Assessment not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ assessment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
