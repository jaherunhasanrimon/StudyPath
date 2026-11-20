/**
 * Retention and compliance helpers for YouTube API data.
 * Source: docs/architecture.md §6.3.
 *
 * Rules:
 * - API-derived data must be refreshed or deleted within 30 days.
 * - Every row has fetched_at and metadata_expires_at = fetched_at + 25 days.
 * - A daily job refreshes rows referenced by active plans.
 */
import { DateTime } from 'luxon';

export const RETENTION_DAYS = 25; // Refresh window before the 30-day hard limit

/**
 * Calculates metadata expiration date (fetched_at + 25 days).
 */
export function calculateMetadataExpiration(fetchedAt: Date = new Date()): Date {
  return DateTime.fromJSDate(fetchedAt).plus({ days: RETENTION_DAYS }).toJSDate();
}

/**
 * Checks whether the metadata has reached its expiration date.
 */
export function isMetadataExpired(expiresAt: string | Date): boolean {
  const expiry = typeof expiresAt === 'string' ? DateTime.fromISO(expiresAt) : DateTime.fromJSDate(expiresAt);
  return DateTime.now() >= expiry;
}

/**
 * Stub for the daily metadata refresh background job.
 * Called by cron: checks active plans and updates YouTube metadata within the 30-day window.
 */
export async function refreshMetadataJobStub(): Promise<{ refreshedCount: number; purgedCount: number }> {
  // Phase 1 stub: records the job intent for compliance verification
  return {
    refreshedCount: 0,
    purgedCount: 0,
  };
}
