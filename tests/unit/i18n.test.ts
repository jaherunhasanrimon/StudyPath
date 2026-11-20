/**
 * Test that i18n messages exist for both locales.
 */
import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import bn from '@/messages/bn.json';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe('i18n messages', () => {
  it('bn and en have the same keys', () => {
    const enKeys = flattenKeys(en).sort();
    const bnKeys = flattenKeys(bn).sort();
    expect(enKeys).toEqual(bnKeys);
  });

  it('no empty values in en', () => {
    const enKeys = flattenKeys(en);
    for (const key of enKeys) {
      const parts = key.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let val: any = en;
      for (const part of parts) val = val[part];
      expect(val, `en.${key} is empty`).not.toBe('');
    }
  });

  it('no empty values in bn', () => {
    const bnKeys = flattenKeys(bn);
    for (const key of bnKeys) {
      const parts = key.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let val: any = bn;
      for (const part of parts) val = val[part];
      expect(val, `bn.${key} is empty`).not.toBe('');
    }
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

    const enKeys = flattenKeys(en);
    const bnKeys = flattenKeys(bn);

    for (const key of requiredKeys) {
      expect(enKeys, `en missing ${key}`).toContain(key);
      expect(bnKeys, `bn missing ${key}`).toContain(key);
    }
  });
});
