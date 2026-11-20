/**
 * GET /api/calendar/:planId.ics?token= — Calendar subscription feed.
 * Governed by docs/architecture.md §7.5 and §10.
 *
 * Public access granted by valid signed HMAC token (no login required).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifyCalendarToken } from '@/modules/plans/token';
import { toIcs } from '@/modules/scheduler/ics';
import { PlanResult, PlanItem } from '@/modules/scheduler/types';
import { DateTime } from 'luxon';

interface RouteContext {
  params: Promise<{ planId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { planId: rawPlanId } = await params;
    const planId = rawPlanId.replace(/\.ics$/, '');

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: { code: 'TOKEN_REQUIRED', message: 'Calendar access token is required' } },
        { status: 401 }
      );
    }

    // Verify cryptographic token
    const isValid = verifyCalendarToken(planId, token);
    if (!isValid) {
      return NextResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Invalid or expired calendar token' } },
        { status: 403 }
      );
    }

    // Create service client or read client to fetch plan without user session
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    });

    const { data: plan, error: planError } = await supabase
      .from('study_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Study plan not found' } },
        { status: 404 }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from('plan_items')
      .select('*')
      .eq('plan_id', planId)
      .order('seq', { ascending: true });

    if (itemsError) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch plan items' } },
        { status: 500 }
      );
    }

    // Convert plan items to PlanResult format for toIcs
    const tz = plan.timezone || 'Asia/Dhaka';
    const schedulerItems: PlanItem[] = (items || []).map((it) => {
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

    const planResult: PlanResult = {
      items: schedulerItems,
      summary: {
        classes: schedulerItems.filter((i) => i.type === 'class').length,
        videoMinutes: schedulerItems.filter((i) => i.type === 'class').reduce((acc, c) => acc + c.durationMin, 0),
        plannedMinutes: schedulerItems.reduce((acc, c) => acc + c.durationMin, 0),
        firstDate: plan.start_date,
        lastDate: plan.end_date,
        studyDays: new Set(schedulerItems.map((i) => i.date)).size,
        avgMinutesPerStudyDay: 0,
      },
      feasibility: { status: 'ok', reasons: [], suggestions: [] },
      warnings: [],
      engineVersion: plan.engine_version,
      inputHash: plan.input_hash,
    };

    const icsString = toIcs(planResult, {
      planId: plan.id,
      baseUrl: process.env.APP_URL || 'https://dishari.app',
      calName: `Dishari - ${plan.name}`,
      timezone: tz,
    });

    return new Response(icsString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${plan.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate calendar feed';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
