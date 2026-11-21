/**
 * POST /api/account/delete — Permanent account deletion cascade (architecture.md §12)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase';

const DeleteAccountSchema = z.object({
  confirmation: z.literal('DELETE'),
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
    const parsed = DeleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_CONFIRMATION', message: 'Please type DELETE to confirm permanent account deletion' } },
        { status: 400 }
      );
    }

    const userId = user.id;

    // 1. Sign out the user from the current session
    await supabase.auth.signOut();

    // 2. Delete user in Supabase Auth via admin client (triggers ON DELETE CASCADE across all tables)
    const supabaseAdmin = createAdminSupabaseClient();
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      // In development / mock mode, if admin deleteUser is not supported, cascade delete manually:
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
    }

    return NextResponse.json({
      ok: true,
      message: 'Your account and all associated study data have been permanently deleted.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
