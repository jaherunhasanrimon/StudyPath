import { useTranslations } from 'next-intl';

/**
 * /today — protected route.
 * Phase 0: placeholder that shows when user is authenticated.
 * Auth check is handled by the (app) layout.
 */
export default function TodayPage() {
  const t = useTranslations();

  return (
    <main id="main-content" className="flex flex-1 flex-col px-4 py-8">
      <h1
        className="text-ink font-semibold"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '40px',
          lineHeight: '48px',
        }}
      >
        {t('nav.today')}
      </h1>
      <p className="mt-4 text-slate">{t('today.empty', { nextClass: 'Monday 19:30' })}</p>
    </main>
  );
}
