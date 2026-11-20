/**
 * Background Notification & Summary Jobs (architecture.md §11 & phases.md §1 Phase 5)
 * Handles send_reminders (push first, email fallback, quiet hours) and weekly_summary.
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { isQuietHour } from './quiet-hours';
import { sendPushNotification } from './push';
import { sendClassReminderEmail, sendWeeklySummaryEmail } from './email';
import {
  calculateAdherence,
  calculateWeeklyMinutes,
  calculateQuizScoreTrend,
  determinePlanHealth,
} from '../learning/progress';

export interface SendRemindersJobResult {
  processedCount: number;
  sentCount: number;
  failedCount: number;
  skippedQuietHoursCount: number;
}

export interface WeeklySummaryJobResult {
  usersProcessed: number;
  summariesCreated: number;
}

/**
 * Worker job: scans pending reminders due at or before nowIso,
 * verifies quiet hours, attempts web push first, falls back to email.
 */
export async function sendRemindersJob(
  supabase: SupabaseClient,
  nowIso = new Date().toISOString()
): Promise<SendRemindersJobResult> {
  const result: SendRemindersJobResult = {
    processedCount: 0,
    sentCount: 0,
    failedCount: 0,
    skippedQuietHoursCount: 0,
  };

  // 1. Fetch pending reminders due now
  const { data: reminders, error: remError } = await supabase
    .from('reminders')
    .select(`
      id,
      user_id,
      plan_item_id,
      channel,
      send_at,
      status,
      plan_items:plan_item_id (
        id,
        video_id,
        scheduled_date,
        videos:video_id (
          title
        )
      )
    `)
    .eq('status', 'pending')
    .lte('send_at', nowIso)
    .limit(50);

  if (remError || !reminders || reminders.length === 0) {
    return result;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  for (const rem of reminders) {
    result.processedCount++;

    // Fetch user preferences and profile
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', rem.user_id)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone, locale')
      .eq('id', rem.user_id)
      .maybeSingle();

    const userTz = profile?.timezone || 'Asia/Dhaka';
    const quietStart = pref?.quiet_hours_start || '22:00';
    const quietEnd = pref?.quiet_hours_end || '07:00';

    // 2. Check quiet hours
    if (isQuietHour(nowIso, quietStart, quietEnd, userTz)) {
      result.skippedQuietHoursCount++;
      await supabase
        .from('reminders')
        .update({ status: 'skipped_quiet_hours' })
        .eq('id', rem.id);
      continue;
    }

    const pushEnabled = pref ? pref.push_enabled : true;
    const emailEnabled = pref ? pref.email_enabled : true;

    if (!pushEnabled && !emailEnabled) {
      await supabase
        .from('reminders')
        .update({ status: 'cancelled' })
        .eq('id', rem.id);
      continue;
    }

    const planItem = Array.isArray(rem.plan_items) ? rem.plan_items[0] : rem.plan_items;
    const video = planItem && (Array.isArray(planItem.videos) ? planItem.videos[0] : planItem.videos);
    const classTitle = video?.title || 'আজকের নির্ধারিত ক্লাস';
    const classUrl = `${appUrl}/class/${rem.plan_item_id}`;
    const unsubscribeUrl = `${appUrl}/api/notifications/unsubscribe?token=${pref?.unsubscribe_token || ''}`;

    let delivered = false;
    let deliveryError: string | null = null;

    // 3. Try Web Push first if enabled
    if (pushEnabled) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', rem.user_id);

      if (subs && subs.length > 0) {
        for (const sub of subs) {
          const pushRes = await sendPushNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth_key },
            },
            {
              title: 'দিশারি পড়ার রুটিন',
              body: `${classTitle} পড়ার সময় হয়েছে।`,
              url: `/class/${rem.plan_item_id}`,
            }
          );

          if (pushRes.success) {
            delivered = true;
            break;
          } else if (pushRes.expired) {
            // Delete expired browser subscription
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          } else {
            deliveryError = pushRes.error || null;
          }
        }
      }
    }

    // 4. Fall back to email if push not delivered and email is enabled
    if (!delivered && emailEnabled) {
      // Look up user email from auth.users (via admin or profile fallback)
      const { data: authUser } = await supabase.auth.admin.getUserById(rem.user_id);
      const studentEmail = authUser?.user?.email;

      if (studentEmail) {
        const emailRes = await sendClassReminderEmail({
          to: studentEmail,
          classTitle,
          classUrl,
          unsubscribeUrl,
          locale: profile?.locale === 'en' ? 'en' : 'bn',
        });

        if (emailRes.success) {
          delivered = true;
        } else {
          deliveryError = emailRes.error || 'Email delivery failed';
        }
      }
    }

    // 5. Update reminder status
    if (delivered) {
      result.sentCount++;
      await supabase
        .from('reminders')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          error: null,
        })
        .eq('id', rem.id);
    } else {
      result.failedCount++;
      await supabase
        .from('reminders')
        .update({
          status: 'failed',
          error: deliveryError || 'No active notification channel available',
        })
        .eq('id', rem.id);
    }
  }

  return result;
}

/**
 * Worker job: compiles weekly performance summaries for students.
 * Note: Guardian summaries are built but strictly disabled until Phase 6 guardian consent exists.
 */
export async function weeklySummaryJob(
  supabase: SupabaseClient,
  referenceIso = new Date().toISOString()
): Promise<WeeklySummaryJobResult> {
  const result: WeeklySummaryJobResult = {
    usersProcessed: 0,
    summariesCreated: 0,
  };

  // Fetch users with active plans
  const { data: plans } = await supabase
    .from('study_plans')
    .select('id, user_id')
    .limit(100);

  if (!plans || plans.length === 0) return result;

  const userIds = Array.from(new Set(plans.map((p) => p.user_id)));
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  for (const userId of userIds) {
    result.usersProcessed++;

    // Fetch plan items
    const { data: items } = await supabase
      .from('plan_items')
      .select('id, status, scheduled_date, completed_at')
      .eq('user_id', userId);

    // Fetch watch progress / sessions
    const { data: progress } = await supabase
      .from('watch_progress')
      .select('seconds_watched, updated_at')
      .eq('user_id', userId);

    // Fetch quiz attempts
    const { data: attempts } = await supabase
      .from('attempts')
      .select('score, max_score, submitted_at')
      .eq('user_id', userId)
      .not('submitted_at', 'is', null);

    const planItemsMapped = (items || []).map((i) => ({
      id: i.id,
      status: i.status as any,
      scheduledDate: i.scheduled_date,
      completedAt: i.completed_at,
    }));

    const sessionsMapped = (progress || []).map((p) => ({
      durationSeconds: p.seconds_watched || 0,
      studiedAt: p.updated_at,
    }));

    const attemptsMapped = (attempts || []).map((a) => ({
      score: a.score || 0,
      maxScore: a.max_score || 10,
      submittedAt: a.submitted_at,
    }));

    const adherence = calculateAdherence(planItemsMapped);
    const weeklyMins = calculateWeeklyMinutes(sessionsMapped, referenceIso, 120);
    const quizStats = calculateQuizScoreTrend(attemptsMapped);
    const overdueCount = planItemsMapped.filter((i) => i.status === 'missed').length;
    const planHealth = determinePlanHealth(adherence.rate, overdueCount);

    const weekStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Store in weekly_summaries
    await supabase.from('weekly_summaries').insert({
      user_id: userId,
      week_start_date: weekStartDate,
      adherence_pct: adherence.rate,
      total_minutes: weeklyMins.thisWeekMinutes,
      quiz_avg_score: quizStats.averageScore,
      plan_health: planHealth,
      guardian_email: null, // Disabled until Phase 6 consent
      guardian_sent_at: null,
    });

    result.summariesCreated++;

    // Send student email if student email is accessible
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const studentEmail = authUser?.user?.email;

    if (studentEmail) {
      const { data: pref } = await supabase
        .from('notification_preferences')
        .select('unsubscribe_token')
        .eq('user_id', userId)
        .maybeSingle();

      const unsubscribeUrl = `${appUrl}/api/notifications/unsubscribe?token=${pref?.unsubscribe_token || ''}`;

      await sendWeeklySummaryEmail({
        to: studentEmail,
        weekRange: `গত ৭ দিনের পড়ার অগ্রগতি (${weekStartDate})`,
        adherenceRate: adherence.rate,
        totalMinutes: weeklyMins.thisWeekMinutes,
        quizAverage: quizStats.averageScore,
        planHealth,
        dashboardUrl: `${appUrl}/progress`,
        unsubscribeUrl,
        locale: 'bn',
      });
    }
  }

  return result;
}
