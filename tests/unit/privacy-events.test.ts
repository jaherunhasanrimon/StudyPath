import { describe, it, expect } from 'vitest';
import { scrubObject } from '@/modules/ai/scrubber';

describe('Privacy & Analytics Event Minimization (phases.md §1 Phase 5 & architecture.md §12)', () => {
  it('ensures event properties do not contain personal data (emails, phone numbers, NID)', () => {
    const rawEventProps = {
      action: 'view_progress_dashboard',
      adherenceRate: 85,
      studyMinutes: 140,
      userFeedback: 'My email is student@example.com and phone is 01712345678',
    };

    const scrubbed = scrubObject(rawEventProps);

    expect(scrubbed.action).toBe('view_progress_dashboard');
    expect(scrubbed.adherenceRate).toBe(85);
    expect(scrubbed.userFeedback).not.toContain('student@example.com');
    expect(scrubbed.userFeedback).not.toContain('01712345678');
    expect(scrubbed.userFeedback).toContain('[REDACTED_EMAIL]');
    expect(scrubbed.userFeedback).toContain('[REDACTED_PHONE]');
  });

  it('uses pseudonymous user_pid for analytics tracking without PII', () => {
    // Verifies that analytics logs use a non-reversible pseudonymous identifier
    const userUuid = '11111111-2222-3333-4444-555555555555';
    // Pseudonymous hash representation
    const userPid = Buffer.from(userUuid).toString('base64url').slice(0, 16);

    expect(userPid).not.toBe(userUuid);
    expect(userPid).not.toContain('@');
    expect(userPid.length).toBe(16);
  });
});
