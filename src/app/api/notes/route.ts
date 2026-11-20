/**
 * GET  /api/notes?videoId=... — Retrieve student note for a video.
 * POST /api/notes             — Save or update note for a video.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { NoteSchema } from '@/modules/plans/schema';

export async function GET(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'videoId query parameter is required' } },
        { status: 400 }
      );
    }

    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ note: note || null }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch note';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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
    const parsed = NoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message || 'Invalid note content',
          },
        },
        { status: 400 }
      );
    }

    const { videoId, body: noteBody } = parsed.data;

    // Check existing note
    const { data: existing } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .maybeSingle();

    let savedNote;
    if (existing) {
      const { data, error } = await supabase
        .from('notes')
        .update({
          body: noteBody,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      savedNote = data;
    } else {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          video_id: videoId,
          body: noteBody,
          source: 'user',
        })
        .select('*')
        .single();
      if (error) throw error;
      savedNote = data;
    }

    return NextResponse.json({ success: true, note: savedNote }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save note';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
