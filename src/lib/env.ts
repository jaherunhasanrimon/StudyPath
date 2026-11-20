/**
 * Environment variable validation with Zod.
 * Import this module to get typed, validated env vars.
 *
 * architecture.md §16 — every variable listed in .env.example.
 */
import { z } from 'zod';

const envSchema = z.object({
  // App
  APP_URL: z.string().url().optional().default('http://localhost:3000'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),

  // YouTube
  YOUTUBE_API_KEY: z.string().optional().default(''),

  // Gemini AI
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL_FAST: z.string().optional().default(''),
  GEMINI_MODEL_VIDEO: z.string().optional().default(''),

  // Background jobs
  CRON_SECRET: z.string().optional().default(''),

  // Calendar export
  ICS_SIGNING_SECRET: z.string().optional().default(''),

  // Rate limiting
  UPSTASH_REDIS_REST_URL: z.string().optional().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(''),

  // Email
  RESEND_API_KEY: z.string().optional().default(''),

  // Web Push
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),

  // Error tracking
  SENTRY_DSN: z.string().optional().default(''),

  // Limits
  AI_DAILY_BUDGET_USD: z.coerce.number().positive().default(5),
  FREE_ACTIVE_PLANS: z.coerce.number().int().positive().default(3),
  FREE_AI_GENERATIONS_PER_MONTH: z.coerce.number().int().positive().default(30),
  MAX_PLAYLIST_VIDEOS: z.coerce.number().int().positive().default(300),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  return result.data;
}

/**
 * Validated environment. Access with `env.VARIABLE_NAME`.
 * Throws on first access if validation fails.
 */
export const env = validateEnv();
