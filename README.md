# Dishari — দিশারি

> Paste a YouTube playlist. Get a study schedule.

A web app for Bangladeshi students. Bangla-first, mobile-first, low-data.

## Quickstart

```bash
# Prerequisites: Node.js 22+, pnpm 12+
pnpm install
cp .env.example .env.local   # fill in values
pnpm dev                     # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (unit and integration) |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm db:types` | Generate Supabase types |
| `pnpm db:migrate` | Apply Supabase migrations |

## Stack

Next.js (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Supabase (Postgres, Auth, RLS), Zod, Luxon, next-intl (bn, en), Vitest, Playwright.

See [docs/architecture.md](docs/architecture.md) for the full tech stack and design decisions.

## Project structure

```
src/
  app/           → Next.js routes
  modules/       → Domain logic (youtube, scheduler, plans, learning, assessments, ai, notifications, consent, admin)
  components/    → UI components
  lib/           → Utilities (env, supabase, logger, time, i18n)
  styles/        → Design tokens and global CSS
  messages/      → i18n message files (bn.json, en.json)
supabase/
  migrations/    → SQL migrations
docs/            → Architecture, phases, design docs
tests/           → Unit and integration tests
e2e/             → Playwright specs
```

## Documentation

- [AGENTS.md](AGENTS.md) — Standing instructions for AI agents
- [docs/architecture.md](docs/architecture.md) — System architecture
- [docs/phases.md](docs/phases.md) — Build plan and acceptance criteria
- [docs/design.md](docs/design.md) — Design system

## Dev-only routes

- `/design` — Design system showcase (tokens, type scale, focus ring, components)

## License

Proprietary. All rights reserved.
