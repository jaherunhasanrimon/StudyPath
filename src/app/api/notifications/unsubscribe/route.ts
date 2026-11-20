/**
 * POST /api/notifications/unsubscribe — Remove a Web Push subscription.
 * GET /api/notifications/unsubscribe — Public one-click email unsubscribe via token.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';

const UnsubscribeBodySchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: NextRequest) {
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
    const parse = UnsubscribeBodySchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', issues: parse.error.issues } },
        { status: 400 }
      );
    }

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', parse.data.endpoint);

    return NextResponse.json({ success: true, unsubscribed: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse(
        '<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>টোকেন পাওয়া যায়নি / Token missing</h2></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Find and update preference
    const { data, error } = await supabase
      .from('notification_preferences')
      .update({ email_enabled: false, updated_at: new Date().toISOString() })
      .eq('unsubscribe_token', token)
      .select('user_id');

    if (error || !data || data.length === 0) {
      return new NextResponse(
        '<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>অকার্যকর টোকেন / Invalid or expired unsubscribe link</h2></body></html>',
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    return new NextResponse(
      `<html>
        <head><title>দিশারি - আনসাবস্ক্রাইব সম্পন্ন</title><meta charset="utf-8"/></head>
        <body style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;text-align:center;padding:60px 20px;color:#0f172a;background-color:#f8fafc;">
          <div style="max-width:480px;margin:0 auto;background:#fff;padding:32px;border-radius:8px;border:1px solid #e2e8f0;">
            <h2 style="color:#0284c7;margin-top:0;">দিশারি</h2>
            <h3 style="margin-bottom:12px;">আপনার ইমেইল রিমাইন্ডার সফলভাবে বন্ধ করা হয়েছে</h3>
            <p style="color:#64748b;line-height:1.5;">You have successfully unsubscribed from StudyPath email notifications. You can re-enable them anytime from your Settings.</p>
            <div style="margin-top:24px;">
              <a href="/" style="background-color:#0284c7;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;display:inline-block;">হোমে ফিরে যান / Return Home</a>
            </div>
          </div>
        </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new NextResponse(`Error: ${message}`, { status: 500 });
  }
}
