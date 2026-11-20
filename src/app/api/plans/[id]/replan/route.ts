/**
 * POST /api/plans/:id/replan — Preview or confirm catch-up schedule replanning.
 * Governed by docs/architecture.md §7.4 and §10.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ReplanRequestSchema } from '@/modules/plans/schema';
import { replan } from '@/modules/scheduler/replan';
import { PlanResult, PlanItem, Video, Progress } from '@/modules/scheduler/types';
import { PlanItemRow, StudyPlanRow } from '@/modules/plans/types';
import { DateTime } from 'luxon';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = ReplanRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message || 'Invalid replan request',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { strategy, confirm } = parsed.data;

    // Fetch existing plan
    const { data: oldPlan, error: planError } = await supabase
      .from('study_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();

    if (planError || !oldPlan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Study plan not found' } },
        { status: 404 }
      );
    }

    // Fetch all items for this plan
    const { data: dbItems, error: itemsError } = await supabase
      .from('plan_items')
      .select('*')
      .eq('plan_id', planId)
      .order('seq', { ascending: true });

    if (itemsError || !dbItems) {
      throw new Error(`Failed to fetch plan items: ${itemsError?.message}`);
    }

    const tz = (oldPlan as StudyPlanRow).timezone || 'Asia/Dhaka';
    const nowIso = parsed.data.nowIso || DateTime.now().setZone(tz).toISO()!;

    // Reconstruct PlanResult from DB items
    const schedulerItems: PlanItem[] = (dbItems as PlanItemRow[]).map((it) => {
      const startDt = DateTime.fromISO(it.start_at, { zone: tz });
      const endDt = DateTime.fromISO(it.end_at, { zone: tz });
      return {
        id: it.id,
        seq: it.seq,
        type: it.type,
        date: startDt.toISODate()!,
        start: startDt.toFormat('HH:mm'),
        end: endDt.toFormat('HH:mm'),
        durationMin: it.duration_min,
        videoIds: it.video_ids,
        part: it.part ? { index: it.part.index, of: it.part.of, fromSec: it.part.fromSec, toSec: it.part.toSec } : undefined,
        covers: it.covers,
        label: it.label,
      };
    });

    const existingPlanResult: PlanResult = {
      items: schedulerItems,
      summary: {
        classes: schedulerItems.filter((i) => i.type === 'class').length,
        videoMinutes: schedulerItems.filter((i) => i.type === 'class').reduce((acc, c) => acc + c.durationMin, 0),
        plannedMinutes: schedulerItems.reduce((acc, c) => acc + c.durationMin, 0),
        firstDate: oldPlan.start_date,
        lastDate: oldPlan.end_date,
        studyDays: new Set(schedulerItems.map((i) => i.date)).size,
        avgMinutesPerStudyDay: 0,
      },
      feasibility: { status: 'ok', reasons: [], suggestions: [] },
      warnings: [],
      engineVersion: oldPlan.engine_version,
      inputHash: oldPlan.input_hash,
    };

    // Build completed Progress
    const completedItems = (dbItems as PlanItemRow[]).filter((it) => it.status === 'done');
    const progress: Progress = {
      completedItemIds: completedItems.map((it) => it.id),
      completedAt: {},
    };
    for (const c of completedItems) {
      if (c.completed_at) {
        progress.completedAt[c.id] = c.completed_at;
      }
    }

    // Reconstruct videos list from items
    const videos: Video[] = [];
    const seenVideos = new Set<string>();
    for (const it of dbItems as PlanItemRow[]) {
      if (it.video_ids) {
        for (const vid of it.video_ids) {
          if (!seenVideos.has(vid)) {
            seenVideos.add(vid);
            videos.push({
              id: vid,
              title: it.label,
              durationSec: it.duration_min * 60,
              position: videos.length,
              available: true,
              embeddable: true,
            });
          }
        }
      }
    }

    // Run pure replan engine
    const replanResult = replan(
      existingPlanResult,
      progress,
      nowIso,
      strategy,
      videos,
      oldPlan.prefs
    );

    // If only previewing diff, return without saving
    if (!confirm) {
      return NextResponse.json({
        preview: true,
        strategy,
        diff: replanResult.diff,
        originalLastDate: oldPlan.end_date,
        newLastDate: replanResult.plan.summary.lastDate,
        newSummary: replanResult.plan.summary,
      });
    }

    // Confirming replan: archive old plan, create new version
    await supabase
      .from('study_plans')
      .update({ status: 'archived' })
      .eq('id', planId);

    const newVersion = (oldPlan.version || 1) + 1;

    const { data: newPlan, error: newPlanError } = await supabase
      .from('study_plans')
      .insert({
        user_id: user.id,
        user_playlist_id: oldPlan.user_playlist_id,
        name: oldPlan.name,
        version: newVersion,
        parent_plan_id: oldPlan.id,
        status: 'active',
        prefs: oldPlan.prefs,
        engine_version: replanResult.plan.engineVersion,
        input_hash: replanResult.plan.inputHash,
        timezone: tz,
        start_date: replanResult.plan.summary.firstDate,
        end_date: replanResult.plan.summary.lastDate,
      })
      .select('*')
      .single();

    if (newPlanError || !newPlan) {
      throw new Error(`Failed to create replanned study plan: ${newPlanError?.message}`);
    }

    // Insert new plan items
    const completedSet = new Set(progress.completedItemIds);
    const newItemsToInsert = replanResult.plan.items.map((it, idx) => {
      const [startH, startM] = it.start.split(':').map(Number);
      const [endH, endM] = it.end.split(':').map(Number);

      const startDt = DateTime.fromISO(it.date, { zone: tz }).set({
        hour: startH,
        minute: startM,
        second: 0,
        millisecond: 0,
      });

      const endDt = DateTime.fromISO(it.date, { zone: tz }).set({
        hour: endH,
        minute: endM,
        second: 0,
        millisecond: 0,
      });

      const isDone = completedSet.has(it.id);

      return {
        plan_id: newPlan.id,
        seq: idx + 1,
        type: it.type,
        start_at: startDt.toUTC().toISO()!,
        end_at: endDt.toUTC().toISO()!,
        duration_min: it.durationMin,
        video_ids: it.videoIds || [],
        part: it.part || null,
        covers: it.covers || [],
        due_at: null,
        label: it.label,
        status: isDone ? 'done' : 'scheduled',
        completed_at: isDone ? progress.completedAt[it.id] || null : null,
        meta: {},
      };
    });

    const { error: insertItemsError } = await supabase
      .from('plan_items')
      .insert(newItemsToInsert);

    if (insertItemsError) {
      throw new Error(`Failed to insert replanned items: ${insertItemsError.message}`);
    }

    return NextResponse.json({
      success: true,
      newPlanId: newPlan.id,
      version: newVersion,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to replan';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
