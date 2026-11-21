import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { recordCreatorOptOut, purgeCreatorInsights } from '@/modules/admin/opt-out';

const publicOptOutSchema = z.object({
  channel_id: z.string().min(1, 'Channel ID is required'),
  channel_title: z.string().min(1, 'Channel title is required'),
  contact_email: z.string().email('Valid email is required').optional(),
  reason: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = publicOptOutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const optOut = await recordCreatorOptOut(supabase, parsed.data);
    const { purgedInsights } = await purgeCreatorInsights(supabase, parsed.data.channel_id);

    return NextResponse.json({
      success: true,
      optOut,
      purgedInsights,
      message: 'Opt-out recorded and creator insights purged immediately.',
    });
  } catch (err) {
    console.error('Error processing creator opt-out:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
