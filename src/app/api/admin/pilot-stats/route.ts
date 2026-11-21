import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminRole } from '@/modules/admin/service';
import { computePilotMetrics } from '@/modules/admin/metrics';

export async function GET() {
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

    const metrics = await computePilotMetrics(supabase);
    return NextResponse.json({ metrics });
  } catch (err) {
    console.error('Error computing pilot metrics:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
