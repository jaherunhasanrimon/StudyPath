/**
 * PATCH /api/plans/:id/items/:itemId — Update plan item status (complete, skip, move).
 * Governed by docs/architecture.md §10.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { PatchPlanItemSchema } from '@/modules/plans/schema';
import { updatePlanItemStatus } from '@/modules/plans/service';

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId, itemId } = await params;
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
    const parsed = PatchPlanItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message || 'Invalid item update',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const item = await updatePlanItemStatus(
      supabase,
      user.id,
      planId,
      itemId,
      parsed.data.action,
      {
        start_at: parsed.data.start_at,
        end_at: parsed.data.end_at,
      }
    );

    return NextResponse.json({ success: true, item }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update item';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
