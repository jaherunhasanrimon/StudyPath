/**
 * Calendar HMAC token signing and verification for RFC 5545 calendar subscription feeds.
 * Governed by docs/architecture.md §7.5.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '@/lib/env';

function getSigningSecret(customSecret?: string): string {
  if (customSecret) return customSecret;
  if (env.ICS_SIGNING_SECRET && env.ICS_SIGNING_SECRET.length > 0) {
    return env.ICS_SIGNING_SECRET;
  }
  // Fallback derived secret for local development/testing
  return env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dishari-calendar-default-secret-key-32b';
}

/**
 * Generate a signed hex HMAC token for a given plan ID.
 */
export function generateCalendarToken(planId: string, customSecret?: string): string {
  const secret = getSigningSecret(customSecret);
  return createHmac('sha256', secret).update(planId).digest('hex');
}

/**
 * Constant-time verification of a calendar subscription token.
 */
export function verifyCalendarToken(planId: string, token: string, customSecret?: string): boolean {
  if (!token || !planId) return false;
  try {
    const expected = generateCalendarToken(planId, customSecret);
    const expectedBuffer = Buffer.from(expected, 'hex');
    const tokenBuffer = Buffer.from(token, 'hex');

    if (expectedBuffer.length !== tokenBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, tokenBuffer);
  } catch {
    return false;
  }
}
