/**
 * In-memory / Upstash rate limiter.
 * Rule: 10 imports per hour per user or IP.
 * Source: docs/architecture.md §6.2 ("per-user limit of 10 imports an hour").
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * Checks and increments the rate limit for a given identifier.
 *
 * @param identifier - User ID or IP address
 * @param limit - Maximum requests allowed in window (default 10)
 * @param windowSec - Window duration in seconds (default 3600 = 1 hour)
 * @returns { success: boolean; remaining: number; reset: number }
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowSec: number = 3600
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const windowMs = windowSec * 1000;

  const record = memoryStore.get(identifier);

  if (!record || now > record.resetAt) {
    // New or expired window
    memoryStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      reset: Math.ceil((now + windowMs) / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil(record.resetAt / 1000),
    };
  }

  record.count += 1;
  return {
    success: true,
    remaining: limit - record.count,
    reset: Math.ceil(record.resetAt / 1000),
  };
}

export function resetRateLimitStore(): void {
  memoryStore.clear();
}
