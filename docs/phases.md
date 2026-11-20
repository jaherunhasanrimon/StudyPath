# phases.md — Dishari (working title) build plan

Version 1.0 · 17 November 2026
Audience: the AI coding agent (Google Antigravity) and the founder.
Read first: `architecture.md` (how it works), `design.md` (how it looks). This file says **in what order to build, and how to know each phase is done**.

---

## 0. How to use this plan

1. **One phase per conversation.** Start each phase in **Planning mode**. The agent writes an Implementation Plan and a Task List, then waits for the founder to approve.
2. **Small steps.** Work in small tasks (roughly 300 changed lines or fewer per commit). Write tests first for pure logic.
3. **End every phase with a Walkthrough:** what changed, how to run it, screenshots, test results, open questions, and the acceptance checklist ticked item by item.
4. **Stop at the end of the phase.** Never start the next phase without the founder's go-ahead.
5. **Minor gate.** Do not onboard anyone under 18 until Phase 6 acceptance passes (guardian consent). Until then the app is invite-only for adult testers.

### How this plan relates to the earlier blueprint

- **Bring-your-own-playlist is the MVP core.** It needs no human curation to start, which removes the reviewer bottleneck from the first release.
- The blueprint's **NCTB-aligned curated paths, diagnostics and mastery tracking, and teacher mode** move to Phase 8, after the core loop is proven.
- The blueprint's validation plan still applies: Phases 0 to 3 produce an app that can test whether students actually follow a generated schedule; the pilot runs after Phase 7.

---

## 1. Phase overview

Effort is in "agent sessions", where one session is a focused planning-mode conversation that ends in a reviewed, verified slice **[A]**.

| Phase | Name | What the founder can see at the end | Depends on | Effort | Review gate |
|---|---|---|---|---|---|
| 0 | Foundation | App skeleton with sign-in, CI and design tokens | none | 1–2 | Sign in on phone and desktop |
| 1 | Playlist import | Paste a link, see a trustworthy preview | 0 | 2 | Test 5 real playlists |
| 2 | Scheduler and plan preview | Preferences produce a dated schedule with calendar export | 1 | 3–4 | Verify 3 own plans by hand |
| 3 | Learning loop | Save a plan, Today view, class page with player, replan | 2 | 3–4 | Use it for 3 real study days |
| 4 | Quizzes and assignments | AI insights, quiz runner, assignments, review items | 3 | 4–5 | Check 20 generated questions |
| 5 | Reminders and dashboard | Push and email reminders, progress dashboard | 3 | 2–3 | Receive real reminders |
| 6 | Hardening and compliance | Guardian consent, privacy, accessibility, speed, offline | 3–5 | 3 | Lawyer and accessibility review |
| 7 | Pilot readiness | Admin review console, feedback tools, pilot dashboard | 6 | 2–3 | Pilot go or no-go |
| 8 | Growth backlog | Curated NCTB paths, teacher mode, and more | 7 | n/a | Per item |

---

## Phase 0 — Foundation

**Goal:** a deployable skeleton that every later phase builds on.

**Tasks**

- [ ] Initialise Next.js (App Router, TypeScript strict), Tailwind CSS, shadcn/ui, ESLint, Prettier, Vitest, Playwright, pnpm.
- [ ] Create the folder layout from `architecture.md` section 5. Add ESLint `no-restricted-imports` rules that enforce the module boundaries.
- [ ] `lib/env.ts`: Zod-validated environment. `.env.example` with every variable from `architecture.md` section 16.
- [ ] Supabase: link the project. Migration 0001: `profiles`, `usage_counters`, `jobs`, `ai_calls`, `events`, `audit_logs`. RLS on with default deny and explicit policies. Generated types. A trigger creates a `profiles` row on sign-up.
- [ ] Auth: email magic link and Google sign-in. Session helpers. A protected route group `(app)`. Store `birth_year` and compute `is_minor`; block minors per the minor gate.
- [ ] i18n with `next-intl` (`bn`, `en`), a language switcher, and Luxon date helpers defaulting to `Asia/Dhaka`.
- [ ] `styles/tokens.css` from `design.md`; fonts through `next/font`; a dev-only `/design` route showing palette, type scale, focus ring and sample components in light and dark.
- [ ] `/api/health`, structured logger, Sentry stub.
- [ ] GitHub Actions: typecheck, lint, unit tests, Playwright smoke test.
- [ ] README with quickstart; `AGENTS.md` and workspace rules committed; docs in `/docs`.

**Deliverables:** repository, Vercel preview deployment, green CI.

**Acceptance criteria**

- `pnpm dev` runs. `pnpm typecheck && pnpm lint && pnpm test` pass locally and in CI.
- Sign-up, sign-in and sign-out work on the preview. Visiting `/today` while signed out redirects to `/`.
- A test confirms RLS is enabled on every table in `public`.
- `/design` shows the palette, type scale, focus ring and sample components in light and dark mode.
- Switching locale changes UI text and date and number formatting.
- A secret scan finds no committed secrets.

**Out of scope:** any YouTube or AI code.

---

## Phase 1 — Playlist import

**Goal:** paste a link and get a preview the student can trust.

**Tasks**

- [ ] `modules/youtube/parse.ts` with tests (at least 25 cases): every accepted URL form, bare IDs, auto-generated mixes (`RD…`), wrong hosts, `javascript:` and other schemes, very long strings, Unicode look-alikes, empty input.
- [ ] YouTube client: `playlists.list`, `playlistItems.list`, `videos.list`, batching of 50, pagination, an ISO-8601 duration parser with tests, and a quota counter.
- [ ] Migration 0002: `playlists`, `videos`, `playlist_items`. RLS: readable by authenticated users, written by the service role.
- [ ] Import service with upserts, `fetched_at`, `metadata_expires_at`. A repeat import within 24 hours makes zero API calls.
- [ ] `POST /api/playlists/resolve`: Zod input, rate limit of 10 imports per hour per user, typed error codes, friendly messages in Bangla and English.
- [ ] `/new` preview UI: paste box, skeleton, list with title, channel, video count, total time and per-video durations; warnings for unavailable, live, non-embeddable, duplicate, very short and over-cap items.
- [ ] Deterministic title analysis: numbering and order check. Show "order looks sequential" or "order may be off" with a drag-to-reorder control.
- [ ] `refresh_metadata` job stub and the retention rules from `architecture.md` section 6.3.
- [ ] Record 5 public playlists as JSON fixtures (no API key in the repository).

**Acceptance criteria**

- A public playlist URL shows a preview in under 5 seconds for 100 videos **[A]**. An unlisted playlist ID works. Private, mix and invalid inputs give specific messages.
- Resolving the same playlist twice within 24 hours makes zero API calls (tested with a counter).
- The quota counter rises by the expected units (about 5 for a 100-video playlist).
- Fixtures with private, deleted or live videos show every expected warning.
- No code path uses `search.list` (a test greps for it).
- Unit tests pass. A Playwright test covers paste, then preview, with a mocked API.

**Out of scope:** scheduling, AI.

**Review gate:** the founder pastes 5 real playlists (Bangla maths, ICT, many short videos, long lectures, a messy one) and compares the numbers with the YouTube pages.

---

## Phase 2 — Scheduler and plan preview (the heart)

**Goal:** preferences produce a believable, dated schedule with feasibility guidance and calendar export.

**Tasks**

- [ ] `modules/scheduler`: types and Zod schemas, normalisation, grouping, day generation, sequential packing, deadline binary search, buffer, spaced-review items, weekly test, feasibility and suggestions, explanation template, ICS export. Follow `architecture.md` section 7 exactly.
- [ ] Unit tests: the golden example in `architecture.md` section 7.7, plus at least 10 more hand-computed cases (many short videos, a long video split, blackout dates, impossible deadline, `classesPerWeek`, `minutesPerDay`, and speed 1.5).
- [ ] Property tests with fast-check for invariants 1 to 9, at least 1,000 cases each.
- [ ] `POST /api/plans/preview`. Benchmark: 300 videos in under 200 ms.
- [ ] Preferences wizard in three steps. Pace: start date, study days and windows, pace mode, playback speed. Checks: quiz cadence and question count, assignment cadence and minutes, review and weekly-test toggles. Review: summary before building.
- [ ] Plan preview UI: Pathway and week list, summary strip, feasibility banner, "Why this plan?" drawer (deterministic explanation), warnings, move an item with the engine revalidating, and a calendar (.ics) download.

**Acceptance criteria**

- The golden example matches exactly. All property tests are green.
- Changing quiz cadence from every 2 classes to every 3 updates the preview in under 300 ms.
- An impossible deadline shows status `impossible` and three suggestions with computed finish dates.
- The downloaded .ics opens in a calendar app with correct local times and a 15-minute alert (manual check).
- The UI works at 360 px width, by keyboard, in Bangla and English.
- A test with `fetch` blocked proves `modules/scheduler` makes no network calls.

**Out of scope:** saving plans, AI.

**Review gate:** the founder builds 3 plans (a 10-video chapter, an ICT chapter, a 60-video course) and checks the dates by hand.

---

## Phase 3 — Learning loop

**Goal:** real daily use.

**Tasks**

- [ ] Migration 0003: `user_playlists`, `study_plans`, `plan_items`, `watch_progress`. RLS.
- [ ] `POST /api/plans`, `GET /api/plans/:id`, `PATCH /api/plans/:id/items/:itemId` (complete, skip, move with revalidation). Enforce `FREE_ACTIVE_PLANS`.
- [ ] Pathway screen `/plans/[id]` with calendar toggle.
- [ ] Today screen `/today`: one primary action, then overdue, then the next three.
- [ ] Class page `/class/[itemId]`: player frame (privacy-enhanced embed, resume position), channel credit, Open on YouTube, personal notes, Mark done, next item.
- [ ] Progress saving (throttled to every 15 seconds and on pause or end). Completion at 90% or on Mark done.
- [ ] `detect_missed` job and on-open detection.
- [ ] Replan: preview diff, apply `shift`, `compress` or `balanced`, plan versions.
- [ ] Calendar feed `GET /api/calendar/:planId.ics?token=`.
- [ ] Empty, error and offline states. Placeholder for quizzes ("quiz scheduled, coming soon").
- [ ] Playwright: the full core path in `bn` and `en`.

**Acceptance criteria**

- A saved plan reloads identically. Today shows the right items in `Asia/Dhaka` even when the device timezone differs (tested).
- The player resumes within 5 seconds of the last saved position.
- A missed class is detected. Replan shows a diff. Applying it creates version + 1 and leaves completed items untouched.
- The .ics feed works without login and rejects a bad token.
- An RLS test proves user B cannot read user A's plans.
- The Playwright suite is green.

**Out of scope:** quizzes and assignments content.

**Review gate:** the founder uses the app for 3 real study days with an actual playlist and writes down friction points.

---

## Phase 4 — Quizzes and assignments

**Goal:** every scheduled check becomes real content, safely and cheaply.

**Tasks**

- [ ] Migration 0004: `video_insights`, `assessments`, `questions`, `attempts`, `attempt_answers`, `reports`. RLS. Answers are never exposed to the client.
- [ ] `modules/ai`: gateway, Gemini adapter, PII scrubber, quotas and kill-switch, `ai_calls` logging, Zod repair loop, prompt versions, and a fake provider for tests.
- [ ] Pipeline A: playlist analysis, shown asynchronously in the preview.
- [ ] Pipeline B: class insights from the video URL at low resolution, lazy for the next 2 classes, cached.
- [ ] Pipeline C: assessment generation with verification steps 1 to 6, plus the topic-based fallback.
- [ ] `run_queue` job, idempotent; request and poll flow (202 with a job ID); progress UI.
- [ ] Quiz runner: MCQ, numeric (with a maths keyboard), short answer, true/false; KaTeX; server-side grading; results with explanations and "review at 12:30" links back to the video.
- [ ] Assignment UI: problem set with hints and reveal; summary with a rubric checklist.
- [ ] Spaced-review items consume stored questions.
- [ ] Report button; auto-hide at 3 reports.
- [ ] Quotas (`FREE_AI_GENERATIONS_PER_MONTH`) and the daily budget kill-switch.
- [ ] Evaluation harness with 5 golden videos and a written report in `docs/evals/`.

**Acceptance criteria**

- On the golden videos: schema pass 100% after repair; grounding pass at least 90%; verification keeps at least 80% of questions or regenerates once.
- No client response contains an answer key before submission (tested end to end).
- Failure injection: a provider timeout shows the labelled topic-based fallback; turning the kill-switch on shows a friendly message.
- Two users requesting the same class: the second is served from cache with zero AI calls.
- Cost per 1-hour class at low resolution is logged and averages under about US$0.15 **[A, verify with current prices]**.
- Founder manual check: 20 generated questions across 3 videos, at least 90% with correct keys, recorded in `docs/evals/manual-check.md`.

**Out of scope:** coach chat, AI grading of free text.

**Review gate:** the founder reviews generated questions for one Higher Math chapter and one ICT chapter.

---

## Phase 5 — Reminders and dashboard

**Goal:** bring students back, and show them (and later guardians) how it is going.

**Tasks**

- [ ] Web Push: subscribe and unsubscribe, service worker, `send_reminders` job. Default reminder 30 minutes before; quiet hours 22:00–07:00 **[A]**.
- [ ] Email fallback through Resend when no push subscription exists. One-click unsubscribe.
- [ ] Reminders are cancelled or moved when an item is completed, skipped or moved.
- [ ] Progress dashboard: adherence, minutes per week, quiz score trend, upcoming workload, plan health (on track or behind).
- [ ] Weekly summary job. Guardian summary built but **disabled until consent exists** (Phase 6).
- [ ] Optional streak counter, off by default.

**Acceptance criteria**

- A push reminder arrives within 60 seconds of its scheduled time on a real phone and respects quiet hours.
- Unsubscribe works. Email fallback fires when there is no push subscription.
- Dashboard numbers match the database on seeded data (tested).
- No analytics event contains personal data (tested).

**Review gate:** the founder receives real reminders for a day and rates them as helpful, not annoying.

---

## Phase 6 — Hardening and compliance

**Goal:** safe for minors, accessible, fast, and ready for a lawyer's review.

**Tasks**

- [ ] Age gate and guardian consent by emailed link; consent log and withdrawal; AI features, reminders and guardian summaries stay off until consent is `granted`.
- [ ] Data export (JSON) and account deletion with cascade; retention job (`architecture.md` section 12).
- [ ] Privacy policy and terms pages in Bangla and English (drafts for a lawyer).
- [ ] Security headers and a strict CSP; CSRF protection; rate-limit audit; RLS review and tests; dependency audit.
- [ ] Accessibility pass: axe plus manual keyboard and screen-reader checks on Today, Class and Quiz.
- [ ] Performance pass: first-load JavaScript at or below about 200 KB on key pages, Lighthouse mobile at least 90 on `/` and `/today` **[A]**.
- [ ] PWA: installable; Today, the active plan and loaded quiz assets work offline. Low-data mode (no thumbnails, queue-for-Wi-Fi reminder).
- [ ] Error boundaries, backups note, a k6 load test at 100 concurrent users on core endpoints.
- [ ] Native-speaker review of all Bangla copy.
- [ ] Legal review pack: YouTube terms, copyright and takedown, PDPA, retention.

**Acceptance criteria**

- An under-18 sign-up cannot use AI features, reminders or summaries until consent is granted (tested).
- Export and delete verified end to end. No ad or tracker requests appear in the network log (tested).
- axe shows no critical issues; Lighthouse and bundle targets met; k6 results documented; CSP in enforce mode with no violations on the main flows.
- The lawyer's review checklist is complete or has dated actions.

**Review gate:** the founder reads the privacy flow as a guardian would, and a lawyer signs off or lists changes.

---

## Phase 7 — Pilot readiness

**Goal:** run a real pilot with measurable outcomes.

**Tasks**

- [ ] Admin console: review queue for reported and unchecked questions (approve, edit, hide); playlist and video flags; takedown and opt-out handling.
- [ ] In-app feedback widget; support email.
- [ ] Pilot dashboard: retention at weeks 1, 4 and 8, adherence, quiz participation, cost per active student.
- [ ] A short list of 10 **starter playlists** (human-checked, shown with a "checked" label only if a reviewer signed off).
- [ ] Pilot protocol: consent forms, onboarding script, success thresholds from the blueprint (section 18.8), incident runbook.

**Acceptance criteria**

- An admin hides a question and it disappears for all users within 1 minute.
- An opt-out request removes a creator's videos from shared insights.
- The pilot dashboard shows correct metrics on seeded data.
- The founder onboards a test group of 5 students end to end.

**Review gate:** pilot go or no-go against the blueprint's thresholds.

---

## Phase 8 — Growth backlog (do not start before Phase 7 passes)

| Item | Entry criteria |
|---|---|
| Curated NCTB-aligned paths and syllabus versioning | Reviewers recruited; a teacher adviser in place |
| Diagnostic and mastery engine | Curated paths exist |
| Teacher and classroom mode (join code, cohort dashboard) | Consent model extended; schools interested |
| Multi-playlist timetable | Single-plan retention is healthy |
| Shareable plan templates | Moderation plan ready |
| AI coach (hint ladder, quotas) | Cost per active student under guardrail |
| Notes or PDF to quiz (user-provided content) | Rights and privacy reviewed |
| Google Calendar two-way sync | OAuth review done |
| Paid tier and payments (bKash, Nagad through an aggregator) | Legal review of the free/paid line (never gate YouTube playback) |
| SymPy verification service | mathjs checks prove insufficient |
| SMS reminders | A local aggregator quote and consent flow |

---

## 2. Value-add features and where they land

| Feature | Why it matters | Effort | Phase |
|---|---|---|---|
| Auto-grouping of short videos into classes | Many playlists have 5-minute clips | S | 2 |
| Feasibility check with three concrete suggestions | Honest planning instead of silent overload | S–M | 2 |
| Calendar export (.ics) with reminders | Works with tools students already use | S | 2–3 |
| Catch-up and replan without pile-up | Missed days are the normal case | M | 3 |
| Resume playback | Saves time and data | S | 3 |
| Review-at-timestamp links in quiz feedback | Turns mistakes into a next action | S | 4 |
| Spaced review items | Better retention than a one-off quiz | M | 4 |
| AI key points and timestamps per class | Faster revision | M | 4 |
| Guardian weekly summary | Builds trust with families | M | 5–6 |
| Offline Today and plan; low-data mode | Data cost is a real barrier | M | 6 |
| Exam-countdown mode (compress plus revision blocks) | Peak-season value | M | 8 |
| Shareable plan templates | Growth through friends | M | 8 |

---

## 3. Global Definition of Done (every phase)

- [ ] Each acceptance criterion is checked, with evidence, in the Walkthrough.
- [ ] Typecheck, lint, unit, integration and e2e tests are green in CI.
- [ ] No secrets in the repository; `.env.example` updated.
- [ ] Keyboard use and contrast meet `design.md` rules.
- [ ] Every new UI string exists in `bn` and `en`.
- [ ] Migrations are tested; RLS tests updated.
- [ ] If YouTube or AI code changed, the compliance rules in `architecture.md` section 6.6 were re-checked.
- [ ] README and docs updated; deviations from `architecture.md` recorded in the decision log below.

---

## 4. Decision log (the agent maintains this)

| Date | Decision | Reason | Phase |
|---|---|---|---|
| 2026-11-20 | Replaced PostgreSQL stored generated column `is_minor` in `0001_foundation.sql` with dynamic computed column `public.is_minor(profiles)` and TypeScript helper `isMinor()` | PostgreSQL does not allow non-immutable expressions (such as `NOW()`) in stored generated columns | Phase 0 |
| 2026-11-20 | Prioritized video-level prefixes (`class\|part\|episode\|lecture\|পর্ব\|ক্লাস\|লেকচার\|#`) over chapter-level prefixes (`chapter\|ch\|অধ্যায়`) in `extractNumberFromTitle` | Educational video titles contain chapter indicators alongside lecture numbers (e.g., "Physics Chapter 2 Part 05"); matching chapter first caused false sequence detections | Phase 1 |
| 2026-11-20 | Enforced Next.js `<Suspense>` boundary around `/new` client form component reading `useSearchParams()` | Required by Next.js App Router to avoid de-opting the whole page from static optimization during build | Phase 1 |
| 2026-11-20 | Implemented pure synchronous 64-bit FNV-1a hash algorithm for canonical `inputHash` | Avoids asynchronous WebCrypto Promise overhead in pure domain modules, keeping `buildPlan` 100% synchronous, pure and portable between Node and browser | Phase 2 |
| 2026-11-20 | Scaled candidate day generation to `Math.max(90, videos.length * 4)` in scheduler engine | Prevents excessive memory overhead and guarantees sub-50ms engine execution (39ms for 300 videos) while enabling fast property testing (9,000 runs in ~2s) | Phase 2 |
| 2026-11-20 | Configured Playwright HTML reporter with `open: 'never'` | Prevents headless CLI test executions from hanging after test runs | Phase 2 |

## 5. Questions the agent must ask the founder (not guess)

- Before Phase 0: Supabase project created? Region? Google Cloud project for the YouTube Data API key? Gemini API key? Vercel and GitHub access?
- Before Phase 4: a budget ceiling for AI spend during testing.
- Before Phase 5: which email address sends reminders and summaries?
- Before Phase 6: who is the legal entity named in the privacy policy and consent text?
