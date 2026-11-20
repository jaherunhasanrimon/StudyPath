'use client';

import { useTheme } from './theme-provider';
import { useTranslations } from 'next-intl';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations();

  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const label = theme === 'light' ? t('theme.dark') : theme === 'dark' ? 'System' : t('theme.light');

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      aria-label={t('theme.toggle')}
      className="flex items-center gap-2 rounded-button border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-mist transition-colors duration-150"
    >
      {theme === 'light' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      )}
      {theme === 'dark' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
      {theme === 'system' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      )}
      {label}
    </button>
  );
}
