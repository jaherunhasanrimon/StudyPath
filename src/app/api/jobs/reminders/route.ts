/**
 * POST /api/jobs/reminders — Background worker tick for sending due reminders.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendRemindersJob } from '@/modules/notifications/jobs';

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
    const result = await sendRemindersJob(supabase);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
