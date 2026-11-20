/**
 * Sentry stub — initialised when SENTRY_DSN is set.
 * Phase 0: placeholder only.
 */

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }
  // TODO: Phase 6 — add Sentry SDK and configure
  // import * as Sentry from '@sentry/nextjs';
  // Sentry.init({ dsn, tracesSampleRate: 0.1, environment: process.env.NODE_ENV });
}

export function captureException(error: unknown): void {
  // TODO: Phase 6 — Sentry.captureException(error);
  console.error('[sentry-stub]', error);
}
