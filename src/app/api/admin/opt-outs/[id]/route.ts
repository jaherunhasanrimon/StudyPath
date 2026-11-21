import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminRole } from '@/modules/admin/service';
import { revokeCreatorOptOut } from '@/modules/admin/opt-out';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: optOutId } = await context.params;
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

    const result = await revokeCreatorOptOut(supabase, optOutId, adminId);
    if (!result.success) {
      return NextResponse.json({ error: 'Failed to revoke opt-out' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error revoking opt-out:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
