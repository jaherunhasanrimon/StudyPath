/**
 * Application-wide constants and configuration limits.
 * Governed by docs/architecture.md §8.4.
 */
import { env } from './env';

export const APP_CONFIG = {
  FREE_ACTIVE_PLANS: env.FREE_ACTIVE_PLANS ?? 3,
  FREE_AI_GENERATIONS_PER_MONTH: env.FREE_AI_GENERATIONS_PER_MONTH ?? 30,
  MAX_PLAYLIST_VIDEOS: env.MAX_PLAYLIST_VIDEOS ?? 300,
  AI_DAILY_BUDGET_USD: env.AI_DAILY_BUDGET_USD ?? 5,
  DEFAULT_TIMEZONE: 'Asia/Dhaka',
  COMPLETION_THRESHOLD_RATIO: 0.9,
  PROGRESS_THROTTLE_SECONDS: 15,
} as const;
