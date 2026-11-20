/**
 * POST /api/jobs/run — Background worker tick for queued AI assessment jobs.
 */
import { NextRequest, NextResponse } from 'next/server';
import { processNextJob } from '@/modules/ai/queue';

export async function POST(req: NextRequest) {
  try {
    // Check optional secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid worker token' } },
          { status: 401 }
        );
      }
    }

    const result = await processNextJob();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
