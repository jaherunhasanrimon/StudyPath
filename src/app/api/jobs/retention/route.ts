/**
 * POST /api/jobs/retention — Periodic compliance data retention worker.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';
import { runRetentionJob } from '@/modules/consent/retention';

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

    const supabaseAdmin = createAdminSupabaseClient();
    const result = await runRetentionJob(supabaseAdmin);

    return NextResponse.json({
      ok: true,
      stats: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
