import { createServerSupabaseClient } from '@/lib/supabase';
import { computePilotMetrics } from '@/modules/admin/metrics';
import { PilotDashboardView } from '@/components/admin/PilotDashboardView';

export default async function AdminPilotPage() {
  const supabase = await createServerSupabaseClient();
  const metrics = await computePilotMetrics(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-ink">
          পাইলট অ্যানালিটিক্স ও কোহোর্ট রিটেনশন
        </h2>
        <p className="text-sm text-slate mt-1">
          ৫ জন পরীক্ষামূলক শিক্ষার্থী দলের অগ্রগতি, শিডিউল মানার হার এবং এআই খরচ সংক্রান্ত সার্বিক ডাটা।
        </p>
      </div>

      <PilotDashboardView metrics={metrics} />
    </div>
  );
}
