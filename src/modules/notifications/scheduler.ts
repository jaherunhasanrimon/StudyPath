/**
 * Reminder Lifecycle Scheduler (architecture.md §11 & phases.md §1 Phase 5)
 * Synchronizes reminders when plan items are completed, skipped, or moved.
 * Adjusts delivery times for student quiet hours and lead preferences.
 */
import { DateTime } from 'luxon';
import { adjustForQuietHours } from './quiet-hours';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ComputeReminderParams {
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string | null; // "HH:mm" or null
  leadMinutes: number; // e.g. 15, 30, 60
  quietStart: string; // "22:00"
  quietEnd: string; // "07:00"
  timezone: string; // "Asia/Dhaka"
}

export interface ComputeReminderResult {
  sendAtIso: string;
  wasAdjusted: boolean;
}

/**
 * Pure function: calculates the exact UTC ISO send_at timestamp for a reminder.
 */
export function computeReminderSendTime(params: ComputeReminderParams): ComputeReminderResult {
  const timeStr = params.scheduledTime && params.scheduledTime.includes(':')
    ? params.scheduledTime
    : '10:00'; // Default morning study time

  const [hour, minute] = timeStr.split(':').map((n) => parseInt(n, 10));

  // Construct DateTime in the student's timezone
  const classDt = DateTime.fromISO(params.scheduledDate, { zone: params.timezone }).set({
    hour: isNaN(hour) ? 10 : hour,
    minute: isNaN(minute) ? 0 : minute,
    second: 0,
    millisecond: 0,
  });

  // Subtract lead time
  const targetDt = classDt.minus({ minutes: params.leadMinutes });
  const rawIso = targetDt.toUTC().toISO()!;

  // Check and adjust for quiet hours
  const adjustment = adjustForQuietHours(
    rawIso,
    params.quietStart,
    params.quietEnd,
    params.timezone
  );

  return {
    sendAtIso: adjustment.adjustedIso,
    wasAdjusted: adjustment.wasAdjusted,
  };
}

/**
 * Cancels pending reminders when a plan item is completed or skipped.
 */
export async function cancelRemindersForPlanItem(
  supabase: SupabaseClient,
  planItemId: string
): Promise<{ cancelledCount: number }> {
  const { data, error } = await supabase
    .from('reminders')
    .update({ status: 'cancelled' })
    .eq('plan_item_id', planItemId)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    throw new Error(`Failed to cancel reminders for item ${planItemId}: ${error.message}`);
  }

  return { cancelledCount: data?.length ?? 0 };
}

/**
 * Reschedules pending reminders when a plan item is replanned to a new date/time.
 */
export async function rescheduleReminderForPlanItem(
  supabase: SupabaseClient,
  params: {
    planItemId: string;
    newScheduledDate: string;
    newScheduledTime: string | null;
    leadMinutes: number;
    quietStart: string;
    quietEnd: string;
    timezone: string;
  }
): Promise<{ updatedCount: number; newSendAtIso: string }> {
  const { sendAtIso } = computeReminderSendTime({
    scheduledDate: params.newScheduledDate,
    scheduledTime: params.newScheduledTime,
    leadMinutes: params.leadMinutes,
    quietStart: params.quietStart,
    quietEnd: params.quietEnd,
    timezone: params.timezone,
  });

  const { data, error } = await supabase
    .from('reminders')
    .update({
      send_at: sendAtIso,
      status: 'pending',
      error: null,
    })
    .eq('plan_item_id', params.planItemId)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    throw new Error(`Failed to reschedule reminder for item ${params.planItemId}: ${error.message}`);
  }

  return {
    updatedCount: data?.length ?? 0,
    newSendAtIso: sendAtIso,
  };
}
