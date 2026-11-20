import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getPlanWithItems } from '@/modules/plans/service';
import { generateCalendarToken } from '@/modules/plans/token';
import { PathwayClient } from '@/components/pathway/PathwayClient';

interface PlanPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanDetailPage({ params }: PlanPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plan = await getPlanWithItems(supabase, user!.id, id);
  if (!plan) {
    notFound();
  }

  const token = generateCalendarToken(plan.id);
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const calendarUrl = `${appUrl}/api/calendar/${plan.id}.ics?token=${token}`;

  return <PathwayClient plan={plan} calendarUrl={calendarUrl} />;
}
