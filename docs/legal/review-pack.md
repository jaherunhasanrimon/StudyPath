# Dishari Legal & Compliance Review Pack

**Prepared for:** Legal Counsel & Founder Review  
**Product:** Dishari (working title) — Study Pathway PWA for Bangladeshi Students  
**Date:** November 2026  
**Phase:** Phase 6 (Hardening and compliance)  

---

## 1. Executive Summary

Dishari is a mobile-first, low-data study pathway web application designed to help secondary and higher secondary students in Bangladesh (typically ages 15–18) organize educational YouTube playlists into day-by-day study schedules.

This document summarizes Dishari's technical compliance with:
1. **YouTube API Terms of Service & Developer Policies**
2. **Bangladesh Personal Data Protection Act (PDPA) 2026**
3. **Google API Services User Data Policy**
4. **Child Safety and Minor Protection Standards**

---

## 2. YouTube API & Content Compliance

| Requirement | Implementation & Architectural Evidence | Status |
|---|---|---|
| **No Video Scraping or Downloading** | Video streams are **never** downloaded, clipped, re-hosted, or scraped. Playback occurs solely via the official YouTube IFrame player embedded from `youtube-nocookie.com` (`src/components/video/YouTubeEmbed.tsx`). | Compliant |
| **No Transcript Scraping** | Dishari does not scrape, store, or republish YouTube transcripts. Pure playlist metadata (titles, durations, sequence) is imported via `playlists.list`, `playlistItems.list`, and `videos.list` (`src/modules/youtube/client.ts`). | Compliant |
| **No `search.list` Usage** | Architectural constraint strictly forbids calling `search.list` (`AGENTS.md` §8; tested via `tests/unit/no-search-list.test.ts`). | Compliant |
| **Channel Attribution & Free Playback** | Channel title and link are prominently displayed on every class page (`src/app/class/[itemId]/page.tsx`). YouTube video playback is never placed behind a paywall. | Compliant |
| **30-Day Data Retention** | API-imported YouTube metadata has expiration timestamps (`metadata_expires_at <= NOW() + INTERVAL '25 days'`) and is refreshed or pruned within 30 days (`supabase/migrations/0002_youtube.sql`). | Compliant |

---

## 3. Bangladesh PDPA 2026 & Minor Protection

Under the Bangladesh Personal Data Protection Act 2026, individuals under 18 years of age are classified as minors requiring verifiable parental/guardian consent before personal data processing and automated interaction.

### 3.1 Age Verification & Minor Detection
- During profile onboarding, birth year is collected.
- Domain function `isMinor(birthYear)` calculates age dynamically against `Asia/Dhaka` local time (`src/modules/consent/service.ts`).
- If age is under 18:
  - **AI Practice Features** (quizzes, problem-solving prompts) are locked.
  - **Study Reminders & Notifications** (push and email) are locked.
  - **Weekly Summaries** are locked.

### 3.2 Verifiable Guardian Consent Flow
- The student inputs their parent or guardian's email address (`POST /api/consent/request`).
- A cryptographically random 256-bit token is generated with a 7-day expiration (`supabase/migrations/0006_compliance_and_consent.sql`).
- An email is dispatched via Resend (`src/modules/consent/email.ts`) containing a direct review link (`/guardian/[token]`).
- The guardian reviews a plain-language summary of Dishari's privacy commitments in Bangla and English (`src/app/guardian/[token]/page.tsx`).
- The guardian can **Grant Consent** or **Decline/Revoke Consent** at any time.
- All actions are logged with timestamps (`granted_at`, `revoked_at`).

---

## 4. Zero Advertising & Zero Tracking

- **Zero Ads:** Dishari carries no commercial banner, pop-up, or interstitial advertisements.
- **Zero Trackers:** No Google Ads, Facebook Pixel, TikTok Pixel, or behavioral tracking SDKs exist in the repository (`docs/phases.md` §1 Phase 6 acceptance).
- **Strict Content Security Policy (CSP):** Configured in `next.config.ts` in enforce mode. Scripts are restricted to `'self'`; frames are restricted to `youtube-nocookie.com` and `youtube.com`; connections are restricted to `supabase.co` and `resend.com`.

---

## 5. Self-Service Data Rights & Cascade Deletion

| Right | API Endpoint | Behavior |
|---|---|---|
| **Right to Data Portability (Export)** | `GET /api/account/export` | Generates a structured JSON file containing all user profile data, study plans, watch progress, notes, quiz scores, and consents (`src/modules/consent/export.ts`). |
| **Right to Erasure (Permanent Deletion)** | `POST /api/account/delete` | Requires explicit `DELETE` confirmation string. Executes `supabaseAdmin.auth.admin.deleteUser()`, triggering PostgreSQL database-level `ON DELETE CASCADE` across all 11 tables (`supabase/migrations/`). |
| **Data Minimization (Retention Purge)** | `POST /api/jobs/retention` | Nightly cron worker deletes AI audit logs older than 30 days and marks expired pending guardian consents (`src/modules/consent/retention.ts`). |

---

## 6. Review Checklist for Legal Counsel

- [ ] Privacy Policy (`/privacy`) accurately states the data controller name and support contact (`support@dishari.app`).
- [ ] Terms of Service (`/terms`) explicitly disclaims affiliation with YouTube LLC and directs users to YouTube Terms of Service.
- [ ] Guardian consent mechanism satisfies Bangladesh PDPA 2026 requirements for verifiable parental sign-off.
- [ ] Takedown and copyright dispute procedure is clearly stated in the Terms.

---
*Document end.*
