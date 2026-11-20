import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * /today — protected route.
 * Phase 0: placeholder that shows when user is authenticated.
 * Redirects to / when signed out (handled by (app) layout).
 */
export default function TodayPage() {
  const t = useTranslations();

  // Phase 0 stub: redirect to home since we don't have auth yet
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    redirect('/');
  }

  return (
    <main id="main-content" className="flex flex-1 flex-col px-4 py-8">
      <h1 className="font-display text-[40px] leading-[48px] font-semibold text-ink">
        {t('nav.today')}
      </h1>
      <p className="mt-4 text-slate">{t('today.empty', { nextClass: 'Monday 19:30' })}</p>
    </main>
  );
}
