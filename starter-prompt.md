# starter-prompt.md — Starting Dishari in Google Antigravity

Version 1.0 · 17 November 2026

This file has everything you paste into Antigravity: the standing rules (`AGENTS.md`), the starter prompt for Phase 0, a template for every later phase, and a few rescue prompts.

---

## 1. Before you start

**Accounts and keys** (create them yourself; never paste secrets into a chat prompt):

- [ ] A GitHub repository (empty).
- [ ] A Supabase project. Choose the region closest to Bangladesh (Singapore is typically the nearest) **[A]**.
- [ ] A Google Cloud project with **YouTube Data API v3** enabled and an API key restricted to that API.
- [ ] A Gemini API key from Google AI Studio.
- [ ] A Vercel account linked to the GitHub repository.
- [ ] Later (Phases 4–6): Upstash Redis, Resend, Sentry.
- [ ] Node.js, pnpm and Git installed. Chrome installed (the agent uses a browser to verify screens).

**Folder setup**

1. Create the project folder and open it as a workspace in Antigravity.
2. Create `docs/` and copy in `architecture.md`, `phases.md` and `design.md`.
3. Create `AGENTS.md` in the repository root with the content from section 2 below.
4. Optional but recommended: also copy the same rules into Antigravity's workspace rules folder. Current guides call it `.agents/rules/`; older guides used `.agent/rules/`. Check the docs or settings of your version **[A]**.
5. Put your keys in `.env.local` yourself. The agent creates `.env.example` with empty placeholders.

**Mode and review settings** (names may differ slightly between versions): use **Planning mode** for each phase, so the agent produces an Implementation Plan and a Task List first. Set the review policy so the agent asks you to approve the plan before it writes code.

---

## 2. AGENTS.md (paste into the repository root)

```markdown
# AGENTS.md — Dishari (working title)

## Product
A web app (PWA) where a student pastes a YouTube playlist link, chooses how often they
want quizzes and assignments, and gets a dated, class-by-class study schedule (the
"Pathway"). Students study in the app with the embedded YouTube player, take quizzes and
assignments, and re-plan when they miss days. Users are mostly Bangladeshi students aged
15 to 18, Bangla first, mobile first, low data.

## Source of truth
docs/architecture.md, docs/phases.md, docs/design.md. If code and docs disagree, or the
docs are unclear, ask the founder. Record every deviation in the decision log
(phases.md section 4).

## Working agreement
- Use Planning mode for every phase. Produce an Implementation Plan and Task List, then
  wait for approval before writing code.
- Work on ONE phase at a time. Stop at the end of the phase. Never start the next phase
  without the founder's go-ahead.
- Small commits with conventional messages (feat:, fix:, test:, docs:, chore:).
- Tests first for pure logic (URL parser, scheduler, grading).
- Never call a task done without running typecheck, lint and tests.
- End every phase with a Walkthrough: what changed, how to run it, screenshots, test
  results, and the acceptance checklist ticked item by item with evidence.

## Stack (do not deviate or add libraries without asking)
Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Supabase (Postgres, Auth,
RLS), Zod, Luxon, TanStack Query, react-hook-form, next-intl (bn, en), KaTeX, mathjs,
Vitest, fast-check, Playwright, Sentry, pino, Upstash ratelimit, Resend, web-push.
Gemini is accessed only through the AiGateway module.

## Module boundaries (enforced by ESLint no-restricted-imports)
- modules/scheduler is PURE: no network, no database, no Next.js, no clock (now is passed in).
- Only modules/ai may call a model provider.
- Only modules/youtube may call the YouTube Data API.
- UI components call route handlers or server actions, except that client components may
  import modules/scheduler for the instant plan preview. The server always recomputes on save.

## Compliance (non-negotiable)
YouTube
- Embed only, via the IFrame player on youtube-nocookie.com. Never download, scrape,
  re-host, clip, re-dub or republish videos. Never scrape transcripts.
- Never use search.list. Use playlists.list, playlistItems.list and videos.list.
- API-derived data is refreshed or deleted within 30 days. Store our own annotations separately.
- Credit the channel on every class page. Never put YouTube playback behind a paywall.
AI
- Every model call goes through AiGateway: PII scrub, quota and kill-switch, Zod validation,
  ai_calls logging. Generate lazily and cache. Label AI content in the UI.
- Answer keys are never sent to the client before submission. Grade on the server.
Privacy
- Assume users may be under 18. No ads, no ad trackers, minimal data.
- Do not onboard anyone under 18 until Phase 6 acceptance passes.
- No personal data in logs, analytics events or AI prompts.
Security
- No secrets in the repository. Validate all input with Zod. RLS on every table, default deny.
- Rate-limit public routes. Never fetch an arbitrary user-supplied URL.

## Code standards
- TypeScript strict. No `any` without a comment explaining why.
- Domain logic as pure functions. Errors as typed results, not thrown strings.
- Every UI string exists in both bn and en. Dates stored in UTC; default timezone Asia/Dhaka.
- Components follow design.md: tokens, type, Pathway, accessibility (44 px targets, contrast,
  visible focus, reduced motion).

## Definition of done
See phases.md section 3.

## Ask, do not guess
Ask the founder about: credentials and accounts, legal wording, pricing and limits,
anything touching minors' data, and any deviation from the docs.
```

---

## 3. The starter prompt (Phase 0)

Paste this into a new Antigravity conversation in Planning mode.

```text
You are the lead engineer building "Dishari" (working title): a web app where a student
pastes a YouTube playlist link, chooses how often they want quizzes and assignments, and
gets a dated class-by-class study schedule called the Pathway.

Before doing anything, read these files in full:
- AGENTS.md
- docs/architecture.md
- docs/phases.md
- docs/design.md
They are the source of truth. If something is ambiguous or two files disagree, ask me.
Do not guess.

Your task now: Phase 0 (Foundation) ONLY, exactly as defined in docs/phases.md.

How to work:
1. Planning mode. First produce an Implementation Plan and a Task List for Phase 0.
   Stop and wait for my approval before writing any code.
2. Ask me for anything you need from the list in docs/phases.md section 5 (accounts,
   regions, keys). Never invent credentials. Use empty placeholders in .env.example.
3. Build in small steps. Commit after each task with a conventional message. Run
   typecheck, lint and tests as you go.
4. Use the stack, folder layout and module boundaries in docs/architecture.md exactly.
   Do not add a library that is not listed there without asking me first.
5. Implement the design tokens, fonts and the dev-only /design route from docs/design.md.
   Do not leave shadcn's default palette, radii or fonts in place.
6. Verify in a real browser. Capture screenshots of /design and the sign-in flow at 360,
   768 and 1280 px, in light and dark mode.
7. Finish with a Walkthrough artifact: what changed, how to run it, screenshots, test
   results, and the Phase 0 acceptance checklist ticked item by item with evidence, plus
   any open questions.
8. Stop after Phase 0. Do not start Phase 1.

Hard rules (also in AGENTS.md): no secrets in the repo; RLS on every table with default
deny; no YouTube or AI code in this phase; every UI string in both bn and en.
```

---

## 4. Kickoff template for every later phase

Replace `{N}` and `{name}`. Paste into a **new** conversation.

```text
Continue the Dishari build with Phase {N}: {name}, exactly as defined in docs/phases.md.

First re-read AGENTS.md and the sections of docs/architecture.md and docs/design.md that
this phase touches. Then run the full existing test suite and confirm the previous phase's
acceptance criteria still pass.

Work in Planning mode: produce an Implementation Plan and Task List, and wait for my
approval before writing code. Follow the same rules as before. Ask me about anything
unclear, and about any deviation from the docs, before doing it.

Finish with a Walkthrough: changes, how to run, screenshots (360, 768, 1280 px; light and
dark) for any new screen, test results, the acceptance checklist ticked item by item with
evidence, updates to the decision log, and open questions. Stop at the end of the phase.
```

### Phase-specific extras to add to the template

**Phase 1.** "Write the URL parser tests first (at least 25 cases). Do not use `search.list` anywhere. Record 5 public playlists as JSON fixtures; the repository must not contain an API key."

**Phase 2.** "Test first. Start with the golden example in architecture.md section 7.7 and make it pass exactly. Then add the property tests for invariants 1 to 9. Block `fetch` in the scheduler tests. Benchmark 300 videos."

**Phase 4.** "Build the fake AI provider and the quota and kill-switch tests before the real Gemini adapter. Run the evaluation harness on the 5 golden videos and write the report to docs/evals/. Do not exceed the AI test budget I give you."

**Phase 6.** "Treat this as a review phase. Before coding, list every place we store or send personal data and propose retention and consent handling for each. Wait for my approval."

---

## 5. Rescue prompts

**The agent drifts from the docs**

```text
Stop. Re-read AGENTS.md and docs/architecture.md section {X}. List every change you made
that conflicts with them, explain why, and propose fixes. Do not continue until I approve.
```

**A dependency or file you did not expect appeared**

```text
Explain every new dependency and every file outside the plan: why it is needed and what
the alternative was. Remove anything unnecessary.
```

**You want proof a phase is done**

```text
Run the full Phase {N} acceptance checklist from docs/phases.md. For each item show the
command, test or screenshot that proves it. Mark anything unproven as NOT DONE.
```

**A bug**

```text
Reproduce the bug with a failing test first. Show the root cause, then the smallest fix,
then the passing test. Do not refactor unrelated code.
```

**Adding a feature safely**

```text
Before coding, tell me which phase and which section of the docs this belongs to. If it
is not in the docs, propose an update to the docs first and wait for my approval.
```

---

## 6. Tips for a smooth build

- Use **one conversation per phase** and keep the Walkthrough artifacts; they are your record.
- Use Planning mode for anything new and the fast mode only for tiny fixes.
- Commit before every large change so you can roll back.
- Read the Implementation Plan before approving it. Check that it matches the phase scope and does not add libraries.
- Open the app yourself on a real phone at the end of every phase.
- If the agent asks for a key, put it in `.env.local` yourself. Do not paste keys into prompts.
- Before Phase 1 ships, read YouTube's official Developer Policies yourself. The research behind these docs used secondary summaries for some points.
