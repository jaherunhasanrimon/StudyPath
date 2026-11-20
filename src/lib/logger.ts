/**
 * Structured logger using pino.
 * No personal data in logs (architecture.md §12).
 */
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino/file', options: { destination: 1 } } // stdout
      : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'email',
      'password',
      'token',
      'access_token',
      'refresh_token',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
});

export type Logger = typeof logger;
