/**
 * POST /api/consent/verify — Guardian submits decision (grant or revoke) using token
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase';
import { recordConsentDecision, verifyConsentToken } from '@/modules/consent/service';

const VerifyConsentSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  decision: z.enum(['grant', 'revoke']),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Token is required' } },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const consent = await verifyConsentToken(supabaseAdmin, token);

    if (!consent) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Consent request not found or expired' } },
        { status: 404 }
      );
    }

    // Also fetch student profile details (display_name only)
    const { data: studentProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name, locale')
      .eq('id', consent.student_id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      consent: {
        id: consent.id,
        guardian_email: consent.guardian_email,
        status: consent.status,
        token_expires_at: consent.token_expires_at,
        student_name: studentProfile?.display_name || null,
        locale: studentProfile?.locale || 'bn',
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifyConsentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const result = await recordConsentDecision(supabaseAdmin, {
      token: parsed.data.token,
      decision: parsed.data.decision,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'DECISION_FAILED', message: result.error || 'Failed to update consent' } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      message: parsed.data.decision === 'grant' ? 'Consent granted successfully' : 'Consent revoked successfully',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
