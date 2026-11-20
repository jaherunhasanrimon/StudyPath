'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Cadence } from '@/modules/scheduler/types';
import { toBanglaDigits } from '@/modules/youtube/duration';

interface CadenceSelectorProps {
  label: string;
  value: Cadence;
  totalClasses: number;
  itemType: 'quiz' | 'assignment';
  onChange: (cadence: Cadence) => void;
}

export function CadenceSelector({
  label,
  value,
  totalClasses,
  itemType,
  onChange,
}: CadenceSelectorProps) {
  const t = useTranslations();
  const locale = useLocale();

  // Determine current active mode
  let currentSelection: '1' | '2' | '3' | 'end' | 'none' = 'none';
  if ('every' in value) {
    if (value.every === 1) currentSelection = '1';
    else if (value.every === 2) currentSelection = '2';
    else currentSelection = '3';
  } else if ('at' in value) {
    currentSelection = value.at;
  }

  // Compute live helper text explaining which classes get checks
  const getHelperText = (): string => {
    if (currentSelection === 'none') {
      return locale === 'bn' ? 'কোনো পরীক্ষা রাখা হবে না।' : 'No assessments will be scheduled.';
    }
    if (currentSelection === 'end') {
      return locale === 'bn'
        ? `সব ${toBanglaDigits(totalClasses)}টি ক্লাসের শেষে ১টি চূড়ান্ত মূল্যায়ন।`
        : `1 final assessment after all ${totalClasses} classes.`;
    }

    const N = 'every' in value ? value.every : 2;
    const dueClasses: number[] = [];
    for (let c = N; c <= totalClasses; c += N) {
      dueClasses.push(c);
    }

    const typeWordBn = itemType === 'quiz' ? 'কুইজ' : 'অ্যাসাইনমেন্ট';
    const typeWordEn = itemType === 'quiz' ? 'Quiz' : 'Assignment';
    const count = dueClasses.length;

    if (count === 0) {
      return locale === 'bn' ? `ক্লাস সংখ্যা কম হওয়ায় কোনো ${typeWordBn} পড়বে না।` : `No ${typeWordEn.toLowerCase()} scheduled due to few classes.`;
    }

    if (locale === 'bn') {
      const classListStr = dueClasses.slice(0, 5).map(toBanglaDigits).join(', ');
      const ellipsis = dueClasses.length > 5 ? '...' : '';
      return `ক্লাস ${classListStr}${ellipsis}-এর পর ${typeWordBn} (${toBanglaDigits(count)}টি ${typeWordBn})।`;
    } else {
      const classListStr = dueClasses.slice(0, 5).join(', ');
      const ellipsis = dueClasses.length > 5 ? '...' : '';
      return `${typeWordEn} after classes ${classListStr}${ellipsis} (${count} ${typeWordEn.toLowerCase()}s).`;
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-ink">{label}</label>

      {/* Segmented Buttons: Every 1, Every 2, Every 3, At end, None */}
      <div className="grid grid-cols-5 gap-1 bg-mist/30 p-1 rounded-sheet border border-border">
        <button
          type="button"
          onClick={() => onChange({ every: 1 })}
          className={`py-2 text-xs sm:text-sm font-medium rounded-input transition-colors ${
            currentSelection === '1'
              ? 'bg-river text-paper shadow-xs font-semibold'
              : 'text-slate hover:text-ink'
          }`}
          style={{ minHeight: '44px' }}
        >
          {locale === 'bn' ? 'প্রতি ১' : 'Every 1'}
        </button>

        <button
          type="button"
          onClick={() => onChange({ every: 2 })}
          className={`py-2 text-xs sm:text-sm font-medium rounded-input transition-colors ${
            currentSelection === '2'
              ? 'bg-river text-paper shadow-xs font-semibold'
              : 'text-slate hover:text-ink'
          }`}
          style={{ minHeight: '44px' }}
        >
          {locale === 'bn' ? 'প্রতি ২' : 'Every 2'}
        </button>

        <button
          type="button"
          onClick={() => onChange({ every: 3 })}
          className={`py-2 text-xs sm:text-sm font-medium rounded-input transition-colors ${
            currentSelection === '3'
              ? 'bg-river text-paper shadow-xs font-semibold'
              : 'text-slate hover:text-ink'
          }`}
          style={{ minHeight: '44px' }}
        >
          {locale === 'bn' ? 'প্রতি ৩' : 'Every 3'}
        </button>

        <button
          type="button"
          onClick={() => onChange({ at: 'end' })}
          className={`py-2 text-xs sm:text-sm font-medium rounded-input transition-colors ${
            currentSelection === 'end'
              ? 'bg-river text-paper shadow-xs font-semibold'
              : 'text-slate hover:text-ink'
          }`}
          style={{ minHeight: '44px' }}
        >
          {t('checks.cadenceEnd')}
        </button>

        <button
          type="button"
          onClick={() => onChange({ at: 'none' })}
          className={`py-2 text-xs sm:text-sm font-medium rounded-input transition-colors ${
            currentSelection === 'none'
              ? 'bg-river text-paper shadow-xs font-semibold'
              : 'text-slate hover:text-ink'
          }`}
          style={{ minHeight: '44px' }}
        >
          {t('checks.cadenceNone')}
        </button>
      </div>

      <p className="text-xs text-slate font-medium pt-0.5">{getHelperText()}</p>
    </div>
  );
}
