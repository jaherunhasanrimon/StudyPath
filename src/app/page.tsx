import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';

/**
 * Home page — signed out view.
 * Phase 0: minimal shell matching design.md §7.1 structure.
 */
export default function HomePage() {
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
          <p className="font-display text-[40px] leading-[48px] font-semibold text-ink">
            {t('app.tagline')}
          </p>
        </div>

        {/* Paste box — placeholder for Phase 1 */}
        <div className="space-y-3">
          <label htmlFor="playlist-url" className="block text-sm font-medium text-ink">
            {t('paste.label')}
          </label>
          <input
            id="playlist-url"
            type="url"
            placeholder="youtube.com/playlist?list=..."
            className="w-full rounded-input border border-border bg-surface px-4 py-3 text-ink placeholder:text-slate focus:border-river focus:ring-0"
            style={{ height: '56px' }}
            disabled
          />
          <button
            disabled
            className="w-full rounded-button bg-river px-6 py-3 text-base font-medium text-paper transition-colors hover:bg-river/90 disabled:opacity-50"
          >
            {t('cta.build')}
          </button>
        </div>

        {/* Sign in link */}
        <div className="text-center">
          <a
            href="/auth/sign-in"
            className="text-river underline underline-offset-4 hover:text-river/80"
          >
            {t('cta.signIn')}
          </a>
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-slate">
          No ads. We embed YouTube videos and never copy them.
        </p>
      </div>
    </main>
  );
}
