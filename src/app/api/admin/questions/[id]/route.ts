import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminRole, updateQuestion } from '@/modules/admin/service';

const updateQuestionSchema = z.object({
  is_hidden: z.boolean().optional(),
  verifier_status: z.enum(['human_ok', 'failed', 'unverified']).optional(),
  stem: z.string().optional(),
  options: z.any().optional(),
  answer: z.any().optional(),
  explanation: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await context.params;
    const cookieStore = await cookies();
    const testUser =
      process.env.NODE_ENV === 'test' ? cookieStore.get('dishari-test-user') : undefined;

    const supabase = await createServerSupabaseClient();
    let userId = '00000000-0000-0000-0000-000000000001';

    if (testUser?.value !== 'admin') {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;

      const isAdmin = await verifyAdminRole(supabase, userId);
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const parsed = updateQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const result = await updateQuestion(supabase, userId, questionId, parsed.data);
    if (!result.success) {
      return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating question:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
