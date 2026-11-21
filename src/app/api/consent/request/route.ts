/**
 * POST /api/consent/request — Student requests guardian consent via email
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createConsentRequest } from '@/modules/consent/service';
import { sendGuardianConsentEmail } from '@/modules/consent/email';

const RequestConsentSchema = z.object({
  guardian_email: z.string().email('Please enter a valid email address'),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = RequestConsentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid email' } },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, locale')
      .eq('id', user.id)
      .maybeSingle();

    const consentResult = await createConsentRequest(supabase, {
      student_id: user.id,
      guardian_email: parsed.data.guardian_email,
    });

    if (!consentResult.success || !consentResult.consent) {
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: consentResult.error || 'Failed to create consent' } },
        { status: 500 }
      );
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const reviewUrl = `${appUrl}/guardian/${consentResult.consent.token}`;

    await sendGuardianConsentEmail({
      to: parsed.data.guardian_email,
      studentName: profile?.display_name || undefined,
      reviewUrl,
      locale: (profile?.locale as 'bn' | 'en') || 'bn',
    });

    return NextResponse.json({
      ok: true,
      consent: {
        id: consentResult.consent.id,
        guardian_email: consentResult.consent.guardian_email,
        status: consentResult.consent.status,
        token_expires_at: consentResult.consent.token_expires_at,
      },
      message: 'Guardian consent request sent successfully',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
