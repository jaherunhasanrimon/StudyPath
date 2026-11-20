import { describe, it, expect } from 'vitest';
import { generateCalendarToken, verifyCalendarToken } from '@/modules/plans/token';

describe('Calendar HMAC Token Service', () => {
  const planId = 'plan-123-abc-456';
  const customSecret = 'test-signing-secret-key-32b';

  it('generates a deterministic 64-char hex HMAC-SHA256 token', () => {
    const token1 = generateCalendarToken(planId, customSecret);
    const token2 = generateCalendarToken(planId, customSecret);
    expect(token1).toBe(token2);
    expect(token1).toHaveLength(64);
  });

  it('verifies a valid token successfully', () => {
    const token = generateCalendarToken(planId, customSecret);
    expect(verifyCalendarToken(planId, token, customSecret)).toBe(true);
  });

  it('rejects tampered or corrupted token', () => {
    const token = generateCalendarToken(planId, customSecret);
    const tampered = token.slice(0, -2) + 'ff';
    expect(verifyCalendarToken(planId, tampered, customSecret)).toBe(false);
  });

  it('rejects token generated with a different secret', () => {
    const token = generateCalendarToken(planId, 'secret-a');
    expect(verifyCalendarToken(planId, token, 'secret-b')).toBe(false);
  });

  it('rejects token for a different planId', () => {
    const token = generateCalendarToken(planId, customSecret);
    expect(verifyCalendarToken('different-plan-id', token, customSecret)).toBe(false);
  });

  it('rejects empty or malformed tokens safely without throwing', () => {
    expect(verifyCalendarToken('', '', customSecret)).toBe(false);
    expect(verifyCalendarToken(planId, 'not-a-hex-string', customSecret)).toBe(false);
    expect(verifyCalendarToken(planId, '1234', customSecret)).toBe(false);
  });
});
