import Link from 'next/link';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';

/**
 * Home page — signed out view.
 * Phase 0: minimal shell matching design.md §7.1 structure.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const code = params?.code;
  if (code && typeof code === 'string') {
    const next = typeof params?.next === 'string' ? params.next : '/today';
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
  }

  return <HomeView />;
}

function HomeView() {
  const t = useTranslations();

  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center px-4 py-16 sm:py-24"
    >
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-ink">
            {t('app.name')}
          </h1>
          <LanguageSwitcher />
        </div>

        {/* Hero */}
        <div className="space-y-2">
          <p
            className="text-ink font-semibold"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '40px',
              lineHeight: '48px',
            }}
          >
            {t('app.tagline')}
          </p>
        </div>

        {/* Paste box */}
        <form action="/new" method="GET" className="space-y-3">
          <label htmlFor="playlist-url" className="block text-sm font-medium text-ink">
            {t('paste.label')}
          </label>
          <input
            id="playlist-url"
            name="url"
            type="text"
            placeholder="youtube.com/playlist?list=..."
            className="block w-full rounded-input border border-border bg-surface px-4 py-3 text-ink placeholder:text-slate focus:border-river focus:ring-0"
            style={{ height: '56px' }}
            required
          />
          <button
            type="submit"
            className="w-full rounded-button bg-river px-6 py-3 text-base font-medium text-paper transition-colors hover:bg-river/90"
            style={{ minHeight: '44px' }}
          >
            {t('cta.build')}
          </button>
        </form>

        {/* Sign in link */}
        <div className="text-center">
          <Link
            href="/auth/sign-in"
            className="text-river underline underline-offset-4 hover:text-river/80"
          >
            {t('cta.signIn')}
          </Link>
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-slate">
          {t('footer.disclaimer')}
        </p>

        {/* Legal links */}
        <footer className="text-center text-xs text-slate space-x-3 pt-2">
          <Link href="/privacy" className="hover:underline">
            গোপনীয়তা নীতি (Privacy)
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:underline">
            ব্যবহারের শর্তাবলী (Terms)
          </Link>
        </footer>
      </div>
    </main>
  );
}
