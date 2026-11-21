import { createServerSupabaseClient } from '@/lib/supabase';
import { getReviewQueue } from '@/modules/admin/service';
import { ReviewQueueTable } from '@/components/admin/ReviewQueueTable';

export default async function AdminQueuePage() {
  const supabase = await createServerSupabaseClient();
  const queue = await getReviewQueue(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-ink">
          প্রশ্ন মডারেশন কিউ (Reported & Pending Questions)
        </h2>
        <p className="text-sm text-slate mt-1">
          এখানে যে কোনো প্রশ্নে ভুল পাওয়া গেলে ১-ক্লিকে তা লুকিয়ে দেওয়া যায়। লুকিয়ে দিলে তাৎক্ষণিকভাবে
          তা সকল শিক্ষার্থীর স্ক্রিন থেকে অপসারিত হয়।
        </p>
      </div>

      <ReviewQueueTable initialQuestions={queue} />
    </div>
  );
}
