import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { DesignShowcase } from './showcase';

/**
 * Dev-only /design route.
 * Shows palette, type scale, focus ring, and sample components.
 * design.md §14: "Provide the dev-only /design route in Phase 0."
 */
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-slate">This page is only available in development.</p>
      </main>
    );
  }

  return (
    <main id="main-content" className="mx-auto max-w-[1100px] px-4 py-8 space-y-16">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-[34px] leading-[42px] font-semibold text-ink">
          Design System
        </h1>
        <div className="flex gap-3">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>

      <DesignShowcase />
    </main>
  );
}
