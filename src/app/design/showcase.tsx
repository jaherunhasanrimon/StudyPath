'use client';

import { useTranslations } from 'next-intl';

const COLORS = [
  { name: 'ink', var: '--ink', desc: 'Primary text' },
  { name: 'paper', var: '--paper', desc: 'Page background' },
  { name: 'surface', var: '--surface', desc: 'Sheets, dialogs, inputs' },
  { name: 'slate', var: '--slate', desc: 'Secondary text' },
  { name: 'border', var: '--border', desc: 'Control borders, rail dashes' },
  { name: 'mist', var: '--mist', desc: 'Decorative hairlines only' },
  { name: 'river', var: '--river', desc: 'Actions, links, focus' },
  { name: 'marigold', var: '--marigold', desc: 'Today knot only' },
  { name: 'paddy', var: '--paddy', desc: 'Done' },
  { name: 'brick', var: '--brick', desc: 'Overdue, error' },
];

const TYPE_SCALE = [
  { name: 'Display XL', size: '40px', lineHeight: '48px', weight: 600, font: 'display', sample: 'আজ — Today' },
  { name: 'Display L', size: '34px', lineHeight: '42px', weight: 600, font: 'display', sample: 'রুটিন — Plans' },
  { name: 'Title', size: '23px', lineHeight: '32px', weight: 600, font: 'ui', sample: 'সপ্তাহ ১ — Week 1' },
  { name: 'Heading', size: '19px', lineHeight: '28px', weight: 600, font: 'ui', sample: 'ক্লাস ৩ — Class 3' },
  { name: 'Body', size: '16px', lineHeight: '1.7', weight: 400, font: 'ui', sample: 'এটি একটি সাধারণ বাক্য। This is a body text sentence.' },
  { name: 'Label', size: '14px', lineHeight: '20px', weight: 500, font: 'ui', sample: 'ইমেইল ঠিকানা — Email address' },
  { name: 'Caption', size: '12px', lineHeight: '16px', weight: 500, font: 'ui', sample: 'এআই তৈরি — AI-generated' },
  { name: 'Numeric', size: '16px', lineHeight: '24px', weight: 500, font: 'ui', sample: '19:30 — 20:30 | 58 min' },
];

export function DesignShowcase() {
  const t = useTranslations();

  return (
    <div className="space-y-16">
      {/* Colour Palette */}
      <section>
        <h2 className="text-[23px] leading-[32px] font-semibold text-ink mb-6">
          {t('design.palette')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {COLORS.map((color) => (
            <div key={color.name} className="space-y-2">
              <div
                className="h-20 rounded-input border border-border"
                style={{ backgroundColor: `var(${color.var})` }}
              />
              <div>
                <p className="text-sm font-medium text-ink">{color.name}</p>
                <p className="text-xs text-slate">{color.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Marigold with ink outline demo */}
      <section>
        <h2 className="text-[23px] leading-[32px] font-semibold text-ink mb-6">
          Marigold knot demo
        </h2>
        <div className="flex items-center gap-6">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: '44px',
              height: '44px',
              backgroundColor: 'var(--marigold)',
              border: '2px solid var(--ink)',
            }}
          >
            <span className="text-ink font-semibold text-sm">3</span>
          </div>
          <span className="text-ink">Today knot — marigold with 2 px ink outline and ink content</span>
        </div>
      </section>

      {/* Type Scale */}
      <section>
        <h2 className="text-[23px] leading-[32px] font-semibold text-ink mb-6">
          {t('design.typography')}
        </h2>
        <div className="space-y-6">
          {TYPE_SCALE.map((style) => (
            <div key={style.name} className="border-b border-mist pb-4">
              <p className="text-xs text-slate mb-1">
                {style.name} · {style.size}/{style.lineHeight} · {style.weight} · font-{style.font}
              </p>
              <p
                style={{
                  fontSize: style.size,
                  lineHeight: style.lineHeight,
                  fontWeight: style.weight,
                  fontFamily: style.font === 'display' ? 'var(--font-display)' : 'var(--font-ui)',
                }}
              >
                {style.sample}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Focus Ring */}
      <section>
        <h2 className="text-[23px] leading-[32px] font-semibold text-ink mb-6">
          {t('design.focusRing')}
        </h2>
        <p className="text-sm text-slate mb-4">
          Tab to these controls to see the focus ring: 3 px solid river, 2 px offset, 5 px paper halo.
        </p>
        <div className="flex flex-wrap gap-4">
          <button className="rounded-button bg-river px-6 py-3 text-paper font-medium">
            Focus me
          </button>
          <input
            type="text"
            placeholder="Tab here"
            className="rounded-input border border-border bg-surface px-4 py-3 text-ink placeholder:text-slate"
          />
          <a href="#focus-demo" className="rounded-button border border-border px-6 py-3 text-river font-medium">
            Link
          </a>
        </div>
      </section>

      {/* Sample Components */}
      <section>
        <h2 className="text-[23px] leading-[32px] font-semibold text-ink mb-6">
          {t('design.components')}
        </h2>

        {/* Buttons */}
        <div className="space-y-4 mb-8">
          <h3 className="text-[19px] leading-[28px] font-semibold text-ink">Buttons</h3>
          <div className="flex flex-wrap gap-4">
            <button className="rounded-button bg-river px-6 py-3 text-paper font-medium transition-colors hover:bg-river/90">
              Primary (river)
            </button>
            <button className="rounded-button border border-border px-6 py-3 text-ink font-medium transition-colors hover:bg-mist">
              Secondary (outline)
            </button>
            <button className="rounded-button bg-river px-6 py-3 text-paper font-medium opacity-50 cursor-not-allowed" disabled>
              Disabled
            </button>
            <button className="rounded-button bg-paddy px-6 py-3 text-paper font-medium transition-colors">
              Done (paddy)
            </button>
            <button className="rounded-button bg-brick px-6 py-3 text-paper font-medium transition-colors">
              Error (brick)
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4 mb-8">
          <h3 className="text-[19px] leading-[28px] font-semibold text-ink">Inputs</h3>
          <div className="max-w-sm space-y-4">
            <div>
              <label htmlFor="demo-input" className="block text-sm font-medium text-ink mb-1">
                Email address
              </label>
              <input
                id="demo-input"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-input border border-border bg-surface px-4 py-3 text-ink placeholder:text-slate focus:border-river"
              />
            </div>
            <div>
              <label htmlFor="demo-bangla" className="block text-sm font-medium text-ink mb-1" lang="bn">
                ইমেইল ঠিকানা
              </label>
              <input
                id="demo-bangla"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-input border border-border bg-surface px-4 py-3 text-ink placeholder:text-slate focus:border-river"
              />
            </div>
          </div>
        </div>

        {/* Cards / surfaces */}
        <div className="space-y-4 mb-8">
          <h3 className="text-[19px] leading-[28px] font-semibold text-ink">Surface</h3>
          <div className="rounded-sheet bg-surface p-6 max-w-sm">
            <h4 className="text-[19px] leading-[28px] font-semibold text-ink">Surface card</h4>
            <p className="text-sm text-slate mt-2">
              Content sits on paper by default. Use surface only for sheets, dialogs, and inputs.
            </p>
            <button className="mt-4 rounded-button bg-river px-6 py-3 text-paper font-medium text-sm">
              Action
            </button>
          </div>
        </div>

        {/* Dialog-like surface with shadow */}
        <div className="space-y-4 mb-8">
          <h3 className="text-[19px] leading-[28px] font-semibold text-ink">Dialog elevation</h3>
          <div
            className="rounded-sheet bg-surface p-6 max-w-sm"
            style={{ boxShadow: 'var(--shadow-dialog)' }}
          >
            <h4 className="text-[19px] leading-[28px] font-semibold text-ink">Dialog</h4>
            <p className="text-sm text-slate mt-2">
              The only elevation in the system: 0 8px 24px rgba(20,32,43,.18).
            </p>
          </div>
        </div>

        {/* Spacing */}
        <div className="space-y-4 mb-8">
          <h3 className="text-[19px] leading-[28px] font-semibold text-ink">Spacing scale (4 px base)</h3>
          <div className="flex items-end gap-2">
            {[4, 8, 12, 16, 24, 32, 48, 64].map((px) => (
              <div key={px} className="flex flex-col items-center gap-1">
                <div
                  className="bg-river rounded-sm"
                  style={{ width: `${px}px`, height: `${px}px` }}
                />
                <span className="text-xs text-slate tabular-nums">{px}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Border radii */}
        <div className="space-y-4">
          <h3 className="text-[19px] leading-[28px] font-semibold text-ink">Border radii</h3>
          <div className="flex flex-wrap gap-6">
            <div className="text-center">
              <div className="w-20 h-12 border-2 border-border rounded-input" />
              <span className="text-xs text-slate mt-1 block">Input (6 px)</span>
            </div>
            <div className="text-center">
              <div className="w-20 h-12 border-2 border-border rounded-button" />
              <span className="text-xs text-slate mt-1 block">Button (8 px)</span>
            </div>
            <div className="text-center">
              <div className="w-20 h-12 border-2 border-border rounded-sheet" />
              <span className="text-xs text-slate mt-1 block">Sheet (16 px)</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
