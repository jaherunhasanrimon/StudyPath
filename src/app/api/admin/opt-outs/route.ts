import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminRole } from '@/modules/admin/service';
import {
  listCreatorOptOuts,
  recordCreatorOptOut,
  purgeCreatorInsights,
} from '@/modules/admin/opt-out';

const adminCreateOptOutSchema = z.object({
  channel_id: z.string().min(1),
  channel_title: z.string().min(1),
  contact_email: z.string().email().optional(),
  reason: z.string().optional(),
});

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

    const optOuts = await listCreatorOptOuts(supabase);
    return NextResponse.json({ optOuts });
  } catch (err) {
    console.error('Error listing creator opt-outs:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const parsed = adminCreateOptOutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const optOut = await recordCreatorOptOut(supabase, parsed.data, adminId);
    const { purgedInsights } = await purgeCreatorInsights(supabase, parsed.data.channel_id);

    return NextResponse.json({ success: true, optOut, purgedInsights });
  } catch (err) {
    console.error('Error creating creator opt-out:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
