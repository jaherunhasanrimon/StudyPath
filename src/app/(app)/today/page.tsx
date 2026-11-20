import { createServerSupabaseClient } from '@/lib/supabase';
import { getTodayItems } from '@/modules/plans/service';
import { TodayClient } from '@/components/today/TodayClient';

export default async function TodayPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const todayData = await getTodayItems(supabase, user!.id);

  return <TodayClient initialData={todayData} />;
}
