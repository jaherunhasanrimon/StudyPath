/**
 * Supabase service layer for study plans, items, watch progress, and notes.
 * Governed by docs/architecture.md §9, §10 and docs/phases.md §2 (Phase 3).
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import { buildPlan } from '@/modules/scheduler';
import { APP_CONFIG } from '@/lib/config';
import {
  CreatePlanInput,
  StudyPlanRow,
  PlanItemRow,
  PlanWithItems,
  WatchProgressRow,
  TodayResponse,
} from './types';
import { detectMissedItems } from './missed';

export class PlanLimitError extends Error {
  constructor(message = 'Active plan limit reached') {
    super(message);
    this.name = 'PlanLimitError';
  }
}

/**
 * Creates and persists a study plan with full server-side recomputation.
 */
export async function createStudyPlan(
  supabase: SupabaseClient,
  userId: string,
  input: CreatePlanInput
): Promise<PlanWithItems> {
  // 1. Enforce FREE_ACTIVE_PLANS limit
  const { count, error: countError } = await supabase
    .from('study_plans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (countError) {
    throw new Error(`Failed to check plan limits: ${countError.message}`);
  }

  if (count !== null && count >= APP_CONFIG.FREE_ACTIVE_PLANS) {
    throw new PlanLimitError(
      `You have reached the maximum limit of ${APP_CONFIG.FREE_ACTIVE_PLANS} active study plans.`
    );
  }

  // 2. Authoritative server-side schedule generation
  const planResult = buildPlan(input.videos, input.prefs);
  const tz = input.prefs.timezone || APP_CONFIG.DEFAULT_TIMEZONE;

  // 3. Create or find user_playlists record
  const { data: userPlaylist, error: userPlaylistError } = await supabase
    .from('user_playlists')
    .insert({
      user_id: userId,
      label: input.playlistTitle || input.name,
      language: 'bn',
    })
    .select('id')
    .single();

  if (userPlaylistError || !userPlaylist) {
    throw new Error(`Failed to create user playlist: ${userPlaylistError?.message}`);
  }

  // 4. Create study_plans record
  const { data: studyPlan, error: planError } = await supabase
    .from('study_plans')
    .insert({
      user_id: userId,
      user_playlist_id: userPlaylist.id,
      name: input.name,
      version: 1,
      status: 'active',
      prefs: input.prefs,
      engine_version: '1.0.0',
      input_hash: planResult.inputHash,
      timezone: tz,
      start_date: planResult.summary.firstDate,
      end_date: planResult.summary.lastDate,
    })
    .select('*')
    .single();

  if (planError || !studyPlan) {
    throw new Error(`Failed to save study plan: ${planError?.message}`);
  }

  // 5. Transform plan items to database rows with absolute timestamps
  const planItemRows = planResult.items.map((item, index) => {
    // Parse item.date (YYYY-MM-DD) and item.start (HH:mm)
    const [startH, startM] = item.start.split(':').map(Number);
    const [endH, endM] = item.end.split(':').map(Number);

    const startDt = DateTime.fromISO(item.date, { zone: tz }).set({
      hour: startH,
      minute: startM,
      second: 0,
      millisecond: 0,
    });

    const endDt = DateTime.fromISO(item.date, { zone: tz }).set({
      hour: endH,
      minute: endM,
      second: 0,
      millisecond: 0,
    });

    return {
      plan_id: studyPlan.id,
      seq: index + 1,
      type: item.type,
      start_at: startDt.toUTC().toISO()!,
      end_at: endDt.toUTC().toISO()!,
      duration_min: item.durationMin,
      video_ids: item.videoIds || [],
      part: item.part || null,
      covers: item.covers || [],
      due_at: null,
      label: item.label,
      status: 'scheduled',
      meta: {},
    };
  });

  const { data: insertedItems, error: itemsError } = await supabase
    .from('plan_items')
    .insert(planItemRows)
    .select('*')
    .order('seq', { ascending: true });

  if (itemsError || !insertedItems) {
    throw new Error(`Failed to save plan items: ${itemsError?.message}`);
  }

  return {
    ...(studyPlan as StudyPlanRow),
    items: insertedItems as PlanItemRow[],
  };
}

/**
 * Fetch all study plans for a user.
 */
export async function getUserStudyPlans(
  supabase: SupabaseClient,
  userId: string
): Promise<StudyPlanRow[]> {
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch study plans: ${error.message}`);
  }

  return data as StudyPlanRow[];
}

/**
 * Fetch a plan by ID with all items and watch progress.
 */
export async function getPlanWithItems(
  supabase: SupabaseClient,
  userId: string,
  planId: string
): Promise<PlanWithItems | null> {
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .single();

  if (planError || !plan) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_id', planId)
    .order('seq', { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to fetch plan items: ${itemsError.message}`);
  }

  // Fetch watch progress for user
  const { data: progressRows } = await supabase
    .from('watch_progress')
    .select('*')
    .eq('user_id', userId);

  const progressMap: Record<string, WatchProgressRow> = {};
  if (progressRows) {
    for (const p of progressRows as WatchProgressRow[]) {
      progressMap[p.video_id] = p;
    }
  }

  return {
    ...(plan as StudyPlanRow),
    items: (items || []) as PlanItemRow[],
    progress: progressMap,
  };
}

/**
 * Update a plan item's status (complete, skip, move).
 */
export async function updatePlanItemStatus(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  itemId: string,
  action: 'complete' | 'skip' | 'move',
  updates?: { start_at?: string; end_at?: string }
): Promise<PlanItemRow> {
  // Verify plan belongs to user
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('id')
    .eq('id', planId)
    .eq('user_id', userId)
    .single();

  if (planError || !plan) {
    throw new Error('Study plan not found or unauthorized');
  }

  const updatePayload: Record<string, unknown> = {};

  if (action === 'complete') {
    updatePayload.status = 'done';
    updatePayload.completed_at = new Date().toISOString();
  } else if (action === 'skip') {
    updatePayload.status = 'skipped';
  } else if (action === 'move') {
    updatePayload.status = 'moved';
    if (updates?.start_at) updatePayload.start_at = updates.start_at;
    if (updates?.end_at) updatePayload.end_at = updates.end_at;
  }

  const { data: item, error: itemError } = await supabase
    .from('plan_items')
    .update(updatePayload)
    .eq('id', itemId)
    .eq('plan_id', planId)
    .select('*')
    .single();

  if (itemError || !item) {
    throw new Error(`Failed to update plan item: ${itemError?.message}`);
  }

  return item as PlanItemRow;
}

/**
 * Save throttled watch progress and automatically mark complete when >= 90%.
 */
export async function saveWatchProgress(
  supabase: SupabaseClient,
  userId: string,
  data: {
    videoId: string;
    planItemId?: string | null;
    lastPositionSec: number;
    maxPositionSec: number;
    durationSec?: number;
    completed?: boolean;
  }
): Promise<WatchProgressRow> {
  let isCompleted = data.completed ?? false;

  // Auto-complete rule: if maxPosition / duration >= 90%
  if (!isCompleted && data.durationSec && data.durationSec > 0) {
    if (data.maxPositionSec / data.durationSec >= APP_CONFIG.COMPLETION_THRESHOLD_RATIO) {
      isCompleted = true;
    }
  }

  const { data: progress, error } = await supabase
    .from('watch_progress')
    .upsert(
      {
        user_id: userId,
        video_id: data.videoId,
        plan_item_id: data.planItemId || null,
        last_position_sec: data.lastPositionSec,
        max_position_sec: data.maxPositionSec,
        completed: isCompleted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id, video_id' }
    )
    .select('*')
    .single();

  if (error || !progress) {
    throw new Error(`Failed to save watch progress: ${error?.message}`);
  }

  // If marked completed and planItemId is provided, mark plan_item as done
  if (isCompleted && data.planItemId) {
    await supabase
      .from('plan_items')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
      })
      .eq('id', data.planItemId);
  }

  return progress as WatchProgressRow;
}

/**
 * Get items for Today view in Asia/Dhaka timezone.
 */
export async function getTodayItems(
  supabase: SupabaseClient,
  userId: string,
  targetDateIso?: string,
  timezone = APP_CONFIG.DEFAULT_TIMEZONE
): Promise<TodayResponse> {
  // Determine reference time in target timezone
  const nowDt = DateTime.now().setZone(timezone);
  const targetDt = targetDateIso
    ? DateTime.fromISO(targetDateIso, { zone: timezone })
    : nowDt;
  const targetDateStr = targetDt.toISODate()!;

  // 1. Find user's active study plan
  const { data: activePlans, error: planError } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);

  if (planError || !activePlans || activePlans.length === 0) {
    return {
      primaryAction: null,
      overdue: [],
      upcoming: [],
      todayDate: targetDateStr,
      timezone,
      planName: null,
      planId: null,
    };
  }

  const activePlan = activePlans[0] as StudyPlanRow;

  // 2. Fetch all items for active plan
  const { data: items, error: itemsError } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_id', activePlan.id)
    .order('seq', { ascending: true });

  if (itemsError || !items) {
    return {
      primaryAction: null,
      overdue: [],
      upcoming: [],
      todayDate: targetDateStr,
      timezone,
      planName: activePlan.name,
      planId: activePlan.id,
    };
  }

  const planItems = items as PlanItemRow[];

  // 3. Detect missed items and update status
  const missedResult = detectMissedItems(planItems, nowDt.toISO()!, timezone);
  if (missedResult.missedItemIds.length > 0) {
    // Update missed items in database
    await supabase
      .from('plan_items')
      .update({ status: 'missed' })
      .in('id', missedResult.missedItemIds);
  }

  // 4. Find primary action:
  // First item scheduled for today that is not done/skipped
  const todayItems = planItems.filter((it) => {
    const itemDate = DateTime.fromISO(it.start_at, { zone: timezone }).toISODate();
    return itemDate === targetDateStr && it.status !== 'done' && it.status !== 'skipped';
  });

  let primaryAction: PlanItemRow | null = todayItems[0] || null;

  // If no items today or all finished, find the first upcoming unfinished item
  if (!primaryAction) {
    const upcomingUnfinished = planItems.find((it) => {
      const itemStart = DateTime.fromISO(it.start_at, { zone: timezone });
      return itemStart >= nowDt && it.status !== 'done' && it.status !== 'skipped';
    });
    if (upcomingUnfinished) {
      primaryAction = upcomingUnfinished;
    }
  }

  // 5. Next 3 upcoming items (after primaryAction or now)
  const remainingUpcoming = planItems
    .filter((it) => {
      if (primaryAction && it.id === primaryAction.id) return false;
      const itemStart = DateTime.fromISO(it.start_at, { zone: timezone });
      return itemStart >= nowDt && it.status !== 'done' && it.status !== 'skipped';
    })
    .slice(0, 3);

  return {
    primaryAction,
    overdue: missedResult.overdueItems,
    upcoming: remainingUpcoming,
    todayDate: targetDateStr,
    timezone,
    planName: activePlan.name,
    planId: activePlan.id,
  };
}
