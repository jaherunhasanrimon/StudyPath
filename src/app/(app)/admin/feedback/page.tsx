import { createServerSupabaseClient } from '@/lib/supabase';
import { listFeedback } from '@/modules/admin/feedback';

export default async function AdminFeedbackPage() {
  const supabase = await createServerSupabaseClient();
  const feedbackList = await listFeedback(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-ink">
          ফিডব্যাক ইনবক্স (Student & User Feedback)
        </h2>
        <p className="text-sm text-slate mt-1">
          শিক্ষার্থীদের পাঠানো মতামত, বাগ রিপোর্ট এবং পাঠ্যক্রমিক পরামর্শ।
        </p>
      </div>

      {feedbackList.length === 0 ? (
        <div className="rounded-card border border-border p-8 text-center text-slate bg-surface">
          এখনও কোনো ফিডব্যাক জমা পড়েনি।
        </div>
      ) : (
        <div className="space-y-4">
          {feedbackList.map((fb) => (
            <div key={fb.id} className="p-5 rounded-card border border-border bg-surface space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-mist text-ink capitalize">
                  {fb.category.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate font-mono">
                  {new Date(fb.created_at).toLocaleDateString('bn-BD')}
                </span>
              </div>
              <p className="text-sm text-ink leading-relaxed">{fb.message}</p>
              {fb.metadata && Object.keys(fb.metadata).length > 0 && (
                <div className="text-xs text-slate pt-2 font-mono border-t border-border/50">
                  {JSON.stringify(fb.metadata)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
