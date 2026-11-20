import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getUserStudyPlans } from '@/modules/plans/service';

export default async function PlansPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plans = await getUserStudyPlans(supabase, user!.id);

  const activePlans = plans.filter((p) => p.status === 'active');
  const archivedPlans = plans.filter((p) => p.status !== 'active');

  return (
    <main id="main-content" className="max-w-[760px] mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-mist pb-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-semibold text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            আমার রুটিনসমূহ
          </h1>
          <p className="text-xs text-slate mt-0.5">সবগুলো সক্রিয় ও পূর্বের রুটিন তালিকা</p>
        </div>
        <Link
          href="/new"
          className="px-4 py-2 rounded-button bg-river text-paper text-xs font-semibold hover:bg-river/90 transition-colors shadow-2xs"
          style={{ minHeight: '40px' }}
        >
          + নতুন রুটিন
        </Link>
      </div>

      {/* Active Plans List */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-river">সক্রিয় রুটিন</h2>

        {activePlans.length === 0 ? (
          <div className="p-8 rounded-sheet border border-border bg-surface text-center space-y-3">
            <p className="text-sm text-slate">কোনো সক্রিয় রুটিন নেই।</p>
            <Link
              href="/new"
              className="inline-block px-5 py-2.5 rounded-button bg-river text-paper text-xs font-semibold hover:bg-river/90 transition-colors"
            >
              নতুন রুটিন তৈরি করুন →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {activePlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/plans/${plan.id}`}
                className="p-5 rounded-sheet border border-border bg-surface hover:border-river hover:shadow-xs transition-all space-y-2 block"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-base text-ink">{plan.name}</h3>
                  <span className="text-xs font-mono text-river bg-river/10 px-2.5 py-0.5 rounded-full shrink-0">
                    v{plan.version}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate font-mono">
                  <span>তারিখ: {plan.start_date} → {plan.end_date}</span>
                  <span>•</span>
                  <span>টাইমজোন: {plan.timezone}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Archived Plans */}
      {archivedPlans.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-mist">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate">পূর্বের রুটিনসমূহ</h2>
          <div className="grid grid-cols-1 gap-3">
            {archivedPlans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-sheet border border-border bg-mist/20 opacity-75 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{plan.name}</span>
                  <span className="text-xs font-mono text-slate">v{plan.version} • {plan.status}</span>
                </div>
                <p className="text-xs text-slate font-mono">
                  {plan.start_date} → {plan.end_date}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
