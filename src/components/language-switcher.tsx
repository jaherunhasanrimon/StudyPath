'use client';

import { useTranslations } from 'next-intl';

export function LanguageSwitcher() {
  const t = useTranslations();

  const switchLocale = (locale: string) => {
    document.cookie = `locale=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  };

  return (
    <div className="flex gap-2" role="group" aria-label={t('locale.switch')}>
      <button
        onClick={() => switchLocale('bn')}
        className="rounded-button border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-mist transition-colors duration-150"
        lang="bn"
      >
        {t('locale.bn')}
      </button>
      <button
        onClick={() => switchLocale('en')}
        className="rounded-button border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-mist transition-colors duration-150"
        lang="en"
      >
        {t('locale.en')}
      </button>
    </div>
  );
}
