import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminRole, getReviewQueue } from '@/modules/admin/service';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const testUser =
      process.env.NODE_ENV === 'test' ? cookieStore.get('dishari-test-user') : undefined;

    const supabase = await createServerSupabaseClient();
    let userId: string | null = null;

    if (testUser?.value === 'admin') {
      userId = '00000000-0000-0000-0000-000000000001';
    } else {
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

    const { searchParams } = new URL(request.url);
    const reportedOnly = searchParams.get('reportedOnly') === 'true';

    const queue = await getReviewQueue(supabase, { reportedOnly });
    return NextResponse.json({ queue });
  } catch (err) {
    console.error('Error fetching admin review queue:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
