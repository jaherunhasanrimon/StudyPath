# Dishari — Vercel Staging Deployment & Configuration Guide

**Environment:** Staging / Preview  
**Branch:** `phase-7`  
**Purpose:** Pre-production verification and 5-student pilot hosting environment.

---

## 1. Vercel Project Setup

1. **Import Git Repository:**
   - Log into [Vercel Dashboard](https://vercel.com).
   - Click **Add New...** → **Project**.
   - Select `StudyPath` (or your repository name) from GitHub.
2. **Framework & Root Directory:**
   - Framework Preset: **Next.js** (auto-detected).
   - Root Directory: `./` (repository root).
   - Build Command: `pnpm build` (auto-detected via `vercel.json`).
   - Output Directory: `.next` (default).
3. **Branch Association:**
   - Target Branch: `phase-7`.
   - Set as a Preview or Staging environment with its own unique domain (e.g., `https://studypath-staging.vercel.app` or `https://studypath-git-phase-7-*.vercel.app`).

---

## 2. Environment Variables Checklist (Staging)

In Vercel **Project Settings → Environment Variables**, configure the following variables for **Preview** and **Production** scopes:

| Variable Name | Required | Description | Example / Source |
|---|---|---|---|
| `APP_URL` | Yes | Fully-qualified public URL of the staging deployment | `https://studypath-staging.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project REST URL | `https://fbviuaniqwjjskt кор.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key | `eyJhbGciOi...` (from Supabase Dashboard) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase backend service role key | Secure secret (Server-only) |
| `YOUTUBE_API_KEY` | Yes | Google Cloud YouTube Data API v3 key | Restrict to YouTube Data API v3 |
| `GEMINI_API_KEY` | Yes | Google Cloud / AI Studio Gemini API key | Secure secret |
| `GEMINI_MODEL_FAST` | Yes | Lightweight model identifier | `gemini-1.5-flash` or `gemini-2.0-flash` |
| `GEMINI_MODEL_VIDEO` | Yes | Multimodal video model identifier | `gemini-1.5-flash` |
| `CRON_SECRET` | Yes | Secret token for Vercel Cron authorization | High-entropy random string |
| `ICS_SIGNING_SECRET` | Yes | Secret for signed calendar subscription links | High-entropy random string |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis REST URL for rate limiting | (Leave empty in local dev / low-traffic staging) |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis REST token | (Leave empty in local dev / low-traffic staging) |
| `RESEND_API_KEY` | Yes | Resend API key for verification & reminder emails | Resend Dashboard API Key |
| `REMINDER_FROM_EMAIL` | Yes | Sender email address | `onboarding@resend.dev` (testing domain) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes | VAPID public key for Web Push notifications | Generated VAPID Public Key |
| `VAPID_PUBLIC_KEY` | Yes | Server copy of VAPID public key | Generated VAPID Public Key |
| `VAPID_PRIVATE_KEY` | Yes | Server-only private VAPID key | Generated VAPID Private Key (Server-only) |
| `VAPID_SUBJECT` | Yes | Web Push contact mailto URI | `mailto:support@dishari.app` |
| `AI_DAILY_BUDGET_USD` | Yes | Maximum daily spend cap on AI calls | `5` |
| `FREE_ACTIVE_PLANS` | Yes | Allowed active plans per student | `3` |
| `FREE_AI_GENERATIONS_PER_MONTH` | Yes | Free AI questions/assessments cap | `30` |
| `MAX_PLAYLIST_VIDEOS` | Yes | Maximum allowed playlist length | `300` |

---

## 3. Supabase Auth Configuration for Staging

To enable Google Sign-In and Magic Links on the Vercel staging deployment:

1. Open **Supabase Dashboard → Authentication → URL Configuration**.
2. **Site URL:**
   - In Staging, set to: `https://studypath-staging.vercel.app` (or your primary staging domain).
3. **Redirect URLs (Allow list):**
   - Add `https://studypath-staging.vercel.app/**`
   - Add `https://studypath-staging.vercel.app/auth/callback`
   - Add `https://*-jaherunhasanrimon.vercel.app/**` (for preview pull request deployments)
   - Keep `http://localhost:3000/**` for local development.

---

## 4. Vercel Cron Configuration

The repository includes `vercel.json` configured with:
- `/api/jobs/reminders` — Runs daily at 1:00 PM UTC (7:00 PM BST Dhaka time).
- `/api/jobs/weekly-summary` — Runs Fridays at 2:00 PM UTC (8:00 PM BST Dhaka time).
- `/api/jobs/retention` — Runs daily at midnight UTC for 30-day compliance data purging.

Vercel automatically sets the `Authorization: Bearer <CRON_SECRET>` header when invoking these endpoints.

---

## 5. Security & Pre-Flight Checklist

Before distributing the staging URL to the 5 pilot students:

- [ ] All database migrations through `0007_pilot_readiness.sql` are applied on Supabase.
- [ ] Row Level Security (RLS) is enabled on all tables (`profiles`, `study_plans`, `questions`, `feedback`, `creator_opt_outs`).
- [ ] The founder account (`rimonhassan013@gmail.com`) has `is_admin = TRUE` in `profiles`.
- [ ] Content-Security-Policy (CSP) headers are active and allowing YouTube nocookie embeds and Supabase websockets.
- [ ] No secrets or private keys are exposed to the client bundle (`NEXT_PUBLIC_` prefixes restricted to public keys only).
