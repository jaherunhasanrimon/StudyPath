import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminRole } from '@/modules/admin/service';
import { submitFeedback, listFeedback, updateFeedbackStatus } from '@/modules/admin/feedback';

const feedbackSchema = z.object({
  category: z.enum(['bug', 'question_error', 'suggestion', 'praise']),
  message: z.string().min(3, 'Message must be at least 3 characters').max(3000),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid feedback submission' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const testUser = cookieStore.get('dishari-test-user');
    const supabase = await createServerSupabaseClient();

    let userId: string | null = null;
    if (testUser?.value) {
      userId = testUser.value;
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    const item = await submitFeedback(supabase, userId, parsed.data);
    return NextResponse.json({ success: true, item });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const testUser = cookieStore.get('dishari-test-user');
    const supabase = await createServerSupabaseClient();

    if (testUser?.value !== 'admin') {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const isAdmin = await verifyAdminRole(supabase, user.id);
      if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;

    const feedback = await listFeedback(supabase, { category, status });
    return NextResponse.json({ feedback });
  } catch (err) {
    console.error('Error listing feedback:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const testUser = cookieStore.get('dishari-test-user');
    const supabase = await createServerSupabaseClient();
    let adminId = '00000000-0000-0000-0000-000000000001';

    if (testUser?.value !== 'admin') {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      adminId = user.id;

      const isAdmin = await verifyAdminRole(supabase, user.id);
      if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;
    if (!id || !['new', 'investigating', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const result = await updateFeedbackStatus(supabase, id, status, adminId);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Error updating feedback status:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
