/**
 * Test that i18n messages exist for both locales.
 */
import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import bn from '@/messages/bn.json';

describe('i18n messages', () => {
  it('bn and en have the same keys', () => {
    const enKeys = Object.keys(en).sort();
    const bnKeys = Object.keys(bn).sort();
    expect(enKeys).toEqual(bnKeys);
  });

  it('no empty values in en', () => {
    const emptyKeys = Object.entries(en).filter(([, v]) => v === '');
    expect(emptyKeys).toEqual([]);
  });

  it('no empty values in bn', () => {
    const emptyKeys = Object.entries(bn).filter(([, v]) => v === '');
    expect(emptyKeys).toEqual([]);
  });

  it('has all required starter strings from design.md', () => {
    const requiredKeys = [
      'paste.label',
      'cta.build',
      'nav.today',
      'cta.start',
      'cta.done',
      'cadence.quiz',
      'missed.banner',
      'cta.replan',
      'today.empty',
      'error.import',
      'offline',
      'ai.checked',
      'ai.unchecked',
      'report',
      'credit',
      'feasible.ok',
    ];

    for (const key of requiredKeys) {
      expect(en).toHaveProperty(key);
      expect(bn).toHaveProperty(key);
    }
  });
});
