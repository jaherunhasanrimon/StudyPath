'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';

export function AppNav() {
  const t = useTranslations('nav');
  const appT = useTranslations('app');
  const pathname = usePathname();

  const navItems = [
    {
      name: t('today'),
      href: '/today',
      icon: (active: boolean) => (
        <span
          className={`w-3.5 h-3.5 rounded-full border-2 ${
            active ? 'bg-marigold border-ink' : 'border-slate bg-transparent'
          }`}
        />
      ),
    },
    {
      name: t('plans'),
      href: '/plans',
      icon: (active: boolean) => (
        <span
          className={`w-3.5 h-3.5 border-2 ${
            active ? 'border-river bg-river/20' : 'border-slate bg-transparent'
          }`}
        />
      ),
    },
    {
      name: t('progress'),
      href: '/progress',
      icon: (active: boolean) => (
        <span
          className={`w-3.5 h-3.5 rotate-45 border-2 ${
            active ? 'border-paddy bg-paddy/20' : 'border-slate bg-transparent'
          }`}
        />
      ),
    },
    {
      name: t('me'),
      href: '/settings',
      icon: (active: boolean) => (
        <span
          className={`w-3.5 h-3.5 rounded-full border-2 border-dashed ${
            active ? 'border-river' : 'border-slate'
          }`}
        />
      ),
    },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="border-b border-mist bg-surface sticky top-0 z-30">
        <div className="mx-auto max-w-[1100px] px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/today"
              className="text-xl font-bold text-ink hover:text-river transition-colors"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {appT('name')}
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-input text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive
                        ? 'bg-river/10 text-river font-semibold'
                        : 'text-slate hover:text-ink hover:bg-mist/40'
                    }`}
                  >
                    {item.icon(isActive)}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/new"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-river text-paper text-xs font-medium hover:bg-river/90 transition-colors"
            >
              <span>+</span>
              <span>নতুন রুটিন</span>
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-mist bg-surface/95 backdrop-blur-md z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                  isActive ? 'text-river font-semibold' : 'text-slate hover:text-ink'
                }`}
                style={{ minHeight: '44px' }}
              >
                {item.icon(isActive)}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
