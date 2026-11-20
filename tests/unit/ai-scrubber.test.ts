import { describe, it, expect } from 'vitest';
import { scrubPii, scrubObject } from '@/modules/ai/scrubber';

describe('AI PII Scrubber', () => {
  it('redacts email addresses in strings', () => {
    const input = 'Contact student at student123@example.com for study questions.';
    const output = scrubPii(input);
    expect(output).not.toContain('student123@example.com');
    expect(output).toContain('[REDACTED_EMAIL]');
  });

  it('redacts Bangladeshi phone numbers in various formats', () => {
    const inputs = [
      'Call 01712345678 for details.',
      'Emergency +8801912345678 contact.',
      'Helpline 01812-345678.',
    ];

    for (const inp of inputs) {
      const out = scrubPii(inp);
      expect(out).toContain('[REDACTED_PHONE]');
      expect(out).not.toMatch(/01\d{9}/);
    }
  });

  it('redacts 10, 13, and 17 digit National ID numbers', () => {
    const input = 'NID: 19982692512345678 and smart NID 1234567890.';
    const output = scrubPii(input);
    expect(output).not.toContain('19982692512345678');
    expect(output).not.toContain('1234567890');
    expect(output).toContain('[REDACTED_ID]');
  });

  it('recursively scrubs complex nested objects and arrays', () => {
    const data = {
      title: 'Class 01: Calculus basics',
      notes: 'Instructor email is instructor@univ.edu',
      subscribers: [
        { name: 'Student', contact: '01512345678' },
        { name: 'Parent', contact: 'parent@home.org' },
      ],
      meta: {
        raw: 'ID 5544332211 is registered.',
      },
    };

    const scrubbed = scrubObject(data);

    expect(scrubbed.notes).toBe('Instructor email is [REDACTED_EMAIL]');
    expect(scrubbed.subscribers[0].contact).toBe('[REDACTED_PHONE]');
    expect(scrubbed.subscribers[1].contact).toBe('[REDACTED_EMAIL]');
    expect(scrubbed.meta.raw).toBe('ID [REDACTED_ID] is registered.');
    expect(scrubbed.title).toBe('Class 01: Calculus basics');
  });
});
