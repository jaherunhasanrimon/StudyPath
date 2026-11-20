/**
 * GET/PUT /api/notifications/preferences — Manage student notification preferences & streak toggle.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';

const UpdatePreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  leadMinutes: z.number().int().min(5).max(120).optional(),
  quietHoursStart: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  streakEnabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    let { data: pref, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!pref) {
      // Create defaults
      const { data: newPref } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id })
        .select('*')
        .single();
      pref = newPref;
    }

    return NextResponse.json({
      pushEnabled: pref?.push_enabled ?? true,
      emailEnabled: pref?.email_enabled ?? true,
      leadMinutes: pref?.lead_minutes ?? 30,
      quietHoursStart: pref?.quiet_hours_start ?? '22:00',
      quietHoursEnd: pref?.quiet_hours_end ?? '07:00',
      streakEnabled: pref?.streak_enabled ?? false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parse = UpdatePreferencesSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', issues: parse.error.issues } },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (parse.data.pushEnabled !== undefined) updates.push_enabled = parse.data.pushEnabled;
    if (parse.data.emailEnabled !== undefined) updates.email_enabled = parse.data.emailEnabled;
    if (parse.data.leadMinutes !== undefined) updates.lead_minutes = parse.data.leadMinutes;
    if (parse.data.quietHoursStart !== undefined) updates.quiet_hours_start = parse.data.quietHoursStart;
    if (parse.data.quietHoursEnd !== undefined) updates.quiet_hours_end = parse.data.quietHoursEnd;
    if (parse.data.streakEnabled !== undefined) updates.streak_enabled = parse.data.streakEnabled;

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(updates)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: {
        pushEnabled: data.push_enabled,
        emailEnabled: data.email_enabled,
        leadMinutes: data.lead_minutes,
        quietHoursStart: data.quiet_hours_start,
        quietHoursEnd: data.quiet_hours_end,
        streakEnabled: data.streak_enabled,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
