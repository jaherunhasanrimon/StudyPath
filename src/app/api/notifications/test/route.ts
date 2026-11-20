/**
 * POST /api/notifications/test — Dispatches an immediate test push or email notification.
 * Enables founder/students to verify notification delivery on real devices within 60s.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendPushNotification } from '@/modules/notifications/push';
import { sendClassReminderEmail } from '@/modules/notifications/email';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // Check user push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    let pushSent = false;
    let pushError = null;

    if (subs && subs.length > 0) {
      for (const sub of subs) {
        const res = await sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          {
            title: 'দিশারি টেস্ট রিমাইন্ডার',
            body: 'আপনার নোটিফিকেশন সিস্টেম সফলভাবে সংযুক্ত হয়েছে!',
            url: '/progress',
          }
        );
        if (res.success) {
          pushSent = true;
          break;
        } else {
          pushError = res.error;
        }
      }
    }

    // Also send test email fallback if push was not sent
    let emailSent = false;
    if (!pushSent && user.email) {
      const emailRes = await sendClassReminderEmail({
        to: user.email,
        classTitle: 'টেস্ট পড়ার রুটিন',
        classUrl: `${appUrl}/progress`,
        unsubscribeUrl: `${appUrl}/settings`,
        locale: 'bn',
      });
      emailSent = emailRes.success;
    }

    return NextResponse.json({
      success: pushSent || emailSent,
      channel: pushSent ? 'push' : emailSent ? 'email' : 'none',
      details: {
        pushSent,
        emailSent,
        pushError,
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
