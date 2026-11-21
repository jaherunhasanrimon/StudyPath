import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase';
import { verifyAdminRole } from '@/modules/admin/service';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const testUser =
    process.env.NODE_ENV === 'test' ? cookieStore.get('dishari-test-user') : undefined;

  if (testUser?.value !== 'admin') {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/auth/sign-in?next=/admin');
    }

    const isAdmin = await verifyAdminRole(supabase, user.id);
    if (!isAdmin) {
      redirect('/today');
    }
  }

  return (
    <div className="space-y-6 px-4 py-8 max-w-6xl mx-auto">
      {/* Admin Header */}
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-river/10 text-river">
              Admin Console
            </span>
            <span className="text-xs text-slate">Phase 7 Pilot</span>
          </div>
          <h1 className="text-2xl font-display font-semibold text-ink mt-1">
            মডারেশন ও পাইলট ড্যাশবোর্ড
          </h1>
        </div>

        {/* Admin Navigation Pills */}
        <nav aria-label="Admin Navigation" className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className="rounded-button border border-border px-3 py-1.5 text-xs sm:text-sm font-medium text-ink hover:bg-mist transition-colors"
          >
            সারসংক্ষেপ (Overview)
          </Link>
          <Link
            href="/admin/queue"
            className="rounded-button border border-border px-3 py-1.5 text-xs sm:text-sm font-medium text-ink hover:bg-mist transition-colors"
          >
            রিভিউ কিউ (Queue)
          </Link>
          <Link
            href="/admin/opt-outs"
            className="rounded-button border border-border px-3 py-1.5 text-xs sm:text-sm font-medium text-ink hover:bg-mist transition-colors"
          >
            ক্রিয়েটর অপ্ট-আউট
          </Link>
          <Link
            href="/admin/pilot"
            className="rounded-button border border-border px-3 py-1.5 text-xs sm:text-sm font-medium text-ink hover:bg-mist transition-colors"
          >
            পাইলট অ্যানালিটিক্স
          </Link>
          <Link
            href="/admin/feedback"
            className="rounded-button border border-border px-3 py-1.5 text-xs sm:text-sm font-medium text-ink hover:bg-mist transition-colors"
          >
            ফিডব্যাক ইনবক্স
          </Link>
        </nav>
      </div>

      <div>{children}</div>
    </div>
  );
}
