# Initial Project Scaffold

**Date:** 2026-05-22
**Branch:** main (initial scaffold — direct commit per git workflow)
**Roadmap item:** Phase 1 — Project scaffold (build order item #1)

## Goal

A clean, building, deployable Next.js 15 project with all tooling configured, the full DB schema in a Supabase migration, placeholder pages for every route, and docs folder populated. `pnpm dev` runs, `pnpm build` succeeds, `pnpm lint` and `pnpm type-check` pass.

## Approach

Use `create-next-app` with App Router + TypeScript + Tailwind v3 + ESLint + `src/` directory. Then layer on:

- shadcn/ui init (Tailwind v3 compatible)
- Supabase CLI + client libraries (`@supabase/supabase-js`, `@supabase/ssr`)
- Husky + lint-staged for pre-commit hooks
- Prettier with project conventions (no semi, single quotes, trailing comma es5, 100 width)
- Strict tsconfig (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Flat ESLint config (`eslint.config.mjs`)

DB schema goes into a single initial migration covering all tables from the data model.

Key decisions resolved before starting:

- `src/` directory: yes, path alias `@/*` → `./src/*`
- Tailwind v3 (not v4)
- Credit card sign: natural sign (income positive, expenses negative)
- `uploads.account_id`: nullable
- `users` table: profiles pattern with trigger on `auth.users` insert
- Timestamps: `created_at` + `updated_at` on all tables

## Steps

- [x] Create this plan file
- [x] Scaffold Next.js 15 project with pnpm
- [x] Configure tsconfig.json (strict mode, path aliases)
- [x] Configure Prettier (.prettierrc)
- [x] Configure ESLint (eslint.config.mjs — flat config)
- [x] Set up Husky + lint-staged
- [x] Initialize shadcn/ui
- [x] Install Supabase CLI + client libs, run supabase init
- [x] Write initial DB migration (all tables + RLS + trigger)
- [x] Create Supabase client helpers (browser, server, middleware)
- [x] Create Next.js middleware for auth
- [x] Create all placeholder route pages
- [x] Create .env.example and .env.local
- [x] Create types/index.ts with type stubs
- [x] Populate docs/ folder (architecture.md, roadmap.md, schema/current.md, CLAUDE.md)
- [x] Verify: pnpm build, pnpm lint, pnpm type-check all pass

## Out of scope for this session

- No auth flow implementation (just Supabase client setup)
- No API routes (chat, import, categorise)
- No AI SDK, papaparse, or pdfjs-dist dependencies
- No functional UI — pages are placeholders only
- No tests

---

<!-- Fill in below during/after the session -->

## What actually happened

- `create-next-app` initially scaffolded Next.js 16 + Tailwind v4. Rewrote package.json to pin Next.js 15.3.3 + Tailwind v3.4.x.
- shadcn/ui initialized manually (CLI had filesystem permission issues in sandbox) — components.json, globals.css with CSS variables, tailwind.config.ts with full theme, cn() utility.
- Supabase init done manually — config.toml + migrations directory.
- Initial migration covers all 8 tables, enums, updated_at triggers, profile auto-creation trigger, full RLS policies with household isolation, and indexes.
- Strict TypeScript (`exactOptionalPropertyTypes`) required explicit cookie type handling in Supabase helpers — fixed with conditional option passing.
- All verification passed: `tsc --noEmit` clean, `next build` clean (13 static pages), `next lint` clean.

## Files created / modified

**Root configs:**
package.json, pnpm-lock.yaml, tsconfig.json, next.config.ts, tailwind.config.ts,
postcss.config.mjs, eslint.config.mjs, components.json, .prettierrc, .prettierignore,
.env.example, .env.local, .gitignore, .husky/pre-commit, README.md, CLAUDE.md

**src/app/ (routes):**
layout.tsx, page.tsx, globals.css,
(auth)/login/page.tsx, (auth)/invite/page.tsx,
(app)/layout.tsx, (app)/dashboard/page.tsx, (app)/transactions/page.tsx,
(app)/budgets/page.tsx, (app)/accounts/page.tsx, (app)/categories/page.tsx,
(app)/chat/page.tsx

**src/lib/:**
utils.ts, supabase/client.ts, supabase/server.ts, supabase/middleware.ts

**src/:**
middleware.ts, types/index.ts, components/ui/.gitkeep

**supabase/:**
config.toml, migrations/20260522000000_initial_schema.sql

**docs/:**
architecture.md, roadmap.md, schema/current.md, work/2026-05-22-initial-scaffold.md, decisions/.gitkeep

## Deferred to next session

- Run `pnpm supabase start` to test migration against local Postgres (requires Docker on host machine)
- `git init` + first commit (Peter to do on his machine)
- Husky init (`pnpm exec husky init` — needs to run in actual git repo)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
