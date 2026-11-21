import { createServerSupabaseClient } from '@/lib/supabase';
import { listCreatorOptOuts } from '@/modules/admin/opt-out';
import { OptOutManager } from '@/components/admin/OptOutManager';

export default async function AdminOptOutsPage() {
  const supabase = await createServerSupabaseClient();
  const optOuts = await listCreatorOptOuts(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-ink">
          ক্রিয়েটর অপ্ট-আউট ব্যবস্থাপনা (Creator Opt-Out Manager)
        </h2>
        <p className="text-sm text-slate mt-1">
          কন্টেন্ট ক্রিয়েটরদের স্বত্বাধিকার রক্ষার্থে কোনো চ্যানেল আপত্তি জানালে এখানে চ্যানেল তালিকাভুক্ত
          করা হয় এবং তাদের কনটেন্ট সম্পর্কিত সকল শেয়ার্ড এআই ইনসাইট অপসারিত হয়।
        </p>
      </div>

      <OptOutManager initialOptOuts={optOuts} />
    </div>
  );
}
