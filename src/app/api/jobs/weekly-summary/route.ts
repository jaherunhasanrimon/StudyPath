/**
 * POST /api/jobs/weekly-summary — Background worker tick for compiling weekly student summaries.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { weeklySummaryJob } from '@/modules/notifications/jobs';

export async function POST(req: NextRequest) {
  try {
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

    const supabase = await createServerSupabaseClient();
    const result = await weeklySummaryJob(supabase);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
