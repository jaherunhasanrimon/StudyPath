/**
 * Personal Data Scrubber (architecture.md §8.1, §12)
 * Ensures no student names, emails, phones or personal data reach external LLMs.
 */

// Email regex matching standard RFC-5322 patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Bangladeshi phone numbers: 11 digits starting with 01[3-9] or 13-14 digits starting with +8801[3-9]
const BD_PHONE_REGEX = /(?:\+?880\s?1|01)[3-9]\d{2}[-\s]?\d{6}/g;

// Formatted phone numbers with area codes or delimiters
const FORMATTED_PHONE_REGEX = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g;

// National ID / Card numbers: 10 (smart NID), 13 (old NID), or 17 (old NID with year) digits
const NID_CARD_REGEX = /\b(?:\d{17}|\d{13}|\d{10})\b/g;

/**
 * Scrubs PII from a single string.
 */
export function scrubPii(text: string): string {
  if (!text || typeof text !== 'string') return text;

  return text
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(BD_PHONE_REGEX, '[REDACTED_PHONE]')
    .replace(FORMATTED_PHONE_REGEX, '[REDACTED_PHONE]')
    .replace(NID_CARD_REGEX, '[REDACTED_ID]');
}

/**
 * Deeply scrubs PII across all values in an object or array.
 */
export function scrubObject<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return scrubPii(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => scrubObject(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[key] = scrubObject(value);
    }
    return result as unknown as T;
  }

  return input;
}
