# Budget App — Claude Code Instructions

This file is read automatically by Claude Code at the start of every session.
**Do not skip it. Do not start writing code before completing the pre-session checklist below.**

---

## What This Project Is

A personal household budgeting web app for two users (Peter + Megan).
Core loop: import bank statements → AI categorises transactions → set budgets per category → chat with your data.

**This is a private tool for two people. Do not overbuild. Ship small slices.**

---

## Key Docs

| Doc          | Path                     | Purpose                                                               |
| ------------ | ------------------------ | --------------------------------------------------------------------- |
| Roadmap      | `docs/roadmap.md`        | Phases, features, build order — the source of truth for what to build |
| Architecture | `docs/architecture.md`   | Stack, repo structure, tech decisions, git workflow                   |
| Work logs    | `docs/work/`             | Per-session plan files — read the most recent before starting         |
| Decisions    | `docs/decisions/`        | Architecture decision records (ADRs)                                  |
| DB schema    | `docs/schema/current.md` | Always-current schema — update after any migration                    |

---

## Current State

> **Update this section at the end of every session.**

- **Current phase:** Phase 5 — Polish (in progress). Phases 1–4 fully complete.
- **Last session:** 2026-05-26 — Vercel edge middleware hotfix. Fixed `MIDDLEWARE_INVOCATION_FAILED` / `ReferenceError: __dirname` on every cold start. Production is healthy: `dpl_6axT7v2xMMvzBqm2iXQc9XW13ptK` (Next.js 15.5.18) is READY.
- **All merged to main (build order items #1–#16 + extras):**
  - #1 Scaffold · #2 Auth + household · #3 Accounts CRUD
  - #4 CSV import · #5 PDF import · #6 Transaction list
  - #7 Category system · #8 Merchant memory · #9 AI categorisation
  - #10 Dashboard charts · #11 Budget management
  - #13 Chat interface (Assistant UI + Vercel AI SDK, streaming, markdown rendering)
  - #14 Chat context injection — `src/lib/queries/chat-context.ts` fetches transactions, budgets, categories, 3-month trends, and recurring; injected as a structured `<financial_data>` block in the system prompt
  - #12 Recurring detection — auto-detect by merchant pattern (2+ months, ≤10% amount spread), manual toggle per row, Fixed Costs dashboard card. Also: dashboard loading skeleton, month-change Suspense, "This month" link, admin future-month navigation, all 4 summary cards in one row.
  - #16 Polish pass — loading skeletons (6 pages), dashboard empty state, mobile table overflow, error logging in queries, type-cast fixes, aria-label on sort headers
  - category_source + is_manual tracking columns (merged)
  - Admin page — `/admin` route (role-gated), delete-all-transactions + delete-all-merchant-mappings (merged)
  - #15 Monthly summary — `/summary` page: Claude-generated recap (headline, spend overview, over-budget, biggest merchant, vs last month, notable patterns). Suspense skeleton on month change, admin future-month nav.
  - Budget auto-seed — budgets auto-copied from previous month on first view; dismissible shadcn Alert banner shows source month
  - Nav/layout restructure — sidebar primary/secondary split, mobile bottom tab bar + Sheet drawer, `/settings` consolidates Accounts + Categories + Danger zone
- **Vercel / build config (main branch):**
  - `vercel.json`: `buildCommand: "pnpm run build"`, `outputDirectory: ".next"` (resolves to `src/.next` from Vercel's `src/` framework root)
  - `next.config.ts`: `distDir: 'src/.next'` + `NormalModuleReplacementPlugin` replacing `testmode/context.js` with noop for edge runtime
  - `scripts/patch-testmode.js`: prebuild that overwrites `node_modules/next/dist/experimental/testmode/context.js` with a noop (busts webpack cache on Vercel)
  - `eslint.config.mjs`: `{ ignores: ['src/.next/**'] }` prevents linting of build artifacts
  - Next.js `15.5.18` — do NOT downgrade; 15.3.3 is Vercel-blocked for CVE
- **Open PRs:**
  - **PR #21** `feature/tide-foundation` — Tide theme foundation (tokens, dark mode, fonts, primitives) — merge this first
  - **PR #22** `feature/tide-pages` — all per-page Tide passes (Chunks 2 + 3 + layout/feature pass) — depends on PR #21
  - **PR #23** `claude/thirsty-chatelet-df9f7d` — audit fixes + chat/summary bug fixes + sidebar polish — depends on PR #22
- **Tide/Editorial theme — what's in PRs #21 + #22:**
  - **Chunk 1 (PR #21):** CSS tokens (warm paper + near-black dark), `next-themes` + ThemeToggle, Fraunces + JetBrains Mono fonts, brand rename → "Tide", primitives (Button density, Card, Badge variants, Progress, Tabs segmented control, Input)
  - **Chunk 2+3 + layout/feature pass (PR #22):**
    - Dashboard: "Manage budgets ↗" + "All ↗" card header links
    - Transactions: merchant search input + category filter dropdown (URL-param driven, debounced)
    - Budgets: 4 KPI stat cards (Total budget / Spent / Remaining / Over budget) + desktop table + mobile cards
    - Summary: Sparkles headline card, BigStat inline stats (Spend/Income/Net), CompareBar vs-last-month, "Monthly recap" H1
    - Chat: sparkle avatar on assistant messages (no bubble), 4 prompt chips on empty state, "Chat with your finances" H1
    - Import: drag-drop DropZone (DataTransfer API), "What we support" card, redesigned success state
- **What's in PR #23 (this branch):**
  - Audit fixes: TransactionTable cell padding, chat bubble style, Dashboard H1, NavLink icon active state, category color migration
  - Chat fix: `TIDE_ANTHROPIC_API_KEY` (Claude Desktop injects empty `ANTHROPIC_API_KEY` into macOS env, shadowing `.env.local` — see ADR 002)
  - Summary fix: same env var fix, model `claude-sonnet-4-5`, strip markdown fences from JSON response, error logging in catch
  - Budget list → proper `<table>` with `<colgroup>` for column alignment; amount + % badge always shown
  - Dashboard card icons + card header alignment + subheadings
  - TideLogo component + SVG favicon
  - Dark mode: `SidebarThemeRow` (Moon icon + label + shadcn Switch) above user chip; hydration fix via `mounted` guard
  - Sign-out: icon button (`LogOut`) with Tooltip
  - Sonner toast wired to chat errors
- **Remaining build order items:**
  - **#17** Import summary — post-upload breakdown (imported / duplicates / from map / from Claude / recurring / uncategorised). Needs `import_history` table.
- **Deferred (not blocking):**
  - Auto-run recurring detection after each import (currently manual-trigger only)
  - Summary "Regenerate" button
  - Dashboard bottom row (recent transactions + quick actions)
  - Sidebar collapse to 64px (optional per design spec, skipped)
  - Header search, notification bell (roadmapped, intentionally not built yet)
  - Set `TIDE_ANTHROPIC_API_KEY` in Vercel project env before deploying to production
- **Known issues:** Node 22 required — always `source ~/.nvm/nvm.sh && nvm use 22` before pnpm scripts. Edge middleware runtime errors confirmed resolved in `dpl_6axT7v2xMMvzBqm2iXQc9XW13ptK` — monitor first few real requests.
- **Components available:** `Skeleton`, `Tooltip`, `Avatar`, `Sheet`, `Badge`, `Switch` (all in `src/components/ui/`).
- **Prop convention:** `MonthSelector` and `SummaryMonthSelector` use `allowFuture` (not `isAdmin`) — the page passes `allowFuture={isAdmin}` so the selector stays role-agnostic.
- **Theme:** `font-display` = Fraunces (serif, use on H1s + CardTitles + hero metrics). `font-mono` = JetBrains Mono (use on tabular numerics). Badge variants: `accent` (sage wash), `warn` (gold), `danger` (rust), `outline`.
- **Env vars:** Use `TIDE_ANTHROPIC_API_KEY` (not `ANTHROPIC_API_KEY`) — Claude Desktop shadows the standard name with an empty value on macOS. See `docs/decisions/002-tide-anthropic-api-key-env-var.md`.

---

## ⚠️ Pre-Session Checklist — Complete Before Writing Any Code

You must complete every step in order. Do not proceed to code until the plan file exists and has been confirmed.

**1. Orient**

- [ ] Read `docs/roadmap.md` — identify the current phase and the specific item being worked on today
- [ ] Read the most recent file in `docs/work/` — understand what was done last session and what was deferred
- [ ] Read `docs/schema/current.md` — know the current DB shape before touching anything data-related

**2. Clarify**

- [ ] If the task is ambiguous, ask one focused clarifying question before proceeding. Do not make assumptions and build the wrong thing.

**3. Plan**

- [ ] Write a plan file to `docs/work/YYYY-MM-DD-{slug}.md` using the format below
- [ ] Plan must include a **Manual test steps** section — happy path + at least one edge/failure case
- [ ] Present the plan as a summary to the user and get explicit confirmation before writing code
- [ ] **Do not write a single line of application code until the plan is confirmed**

**4. Branch**

- [ ] `git checkout -b feature/{name}` (unless this is the very first scaffold commit to main)

---

## Plan File Format

Filename: `docs/work/YYYY-MM-DD-{short-slug}.md`
Example: `docs/work/2026-05-22-csv-import.md`

```markdown
# {Feature / Task Name}

**Date:** YYYY-MM-DD  
**Branch:** feature/{name}  
**Roadmap item:** Phase N — {item name}

## Goal

One sentence: what does "done" look like for this session?

## Approach

How will this be built? Key technical decisions made upfront.
Call out anything non-obvious or where multiple approaches were considered.

## Steps

- [ ] Step 1
- [ ] Step 2
- [ ] Step 3
      (Be specific — vague steps lead to vague output)

## Manual test steps

How to verify this works end-to-end after the code is written.
Cover the happy path and at least one failure/edge case.

- [ ] Test step 1 (e.g. navigate to X, do Y, expect Z)
- [ ] Test step 2
- [ ] Edge case: what happens if …

## Out of scope for this session

Explicitly list anything related but not being done today.

---

<!-- Fill in below during/after the session -->

## What actually happened

(decisions made, approaches changed, surprises)

## Files created / modified

(list key files)

## Deferred to next session

(anything punted — be specific so next session picks it up cleanly)

## Status

- [ ] In progress
- [ ] Complete
- [ ] Partial — see deferred
```

---

## Post-Session Checklist

Do not close the session without completing these steps:

- [ ] Fill in the "What actually happened", "Files changed", and "Deferred" sections of the plan file
- [ ] Update the **Current State** section of this file (`CLAUDE.md`)
- [ ] Update `docs/schema/current.md` if any migrations were added or changed
- [ ] Add an ADR to `docs/decisions/` if a significant architectural decision was made
- [ ] Run `pnpm lint` — fix any errors before committing
- [ ] Run `pnpm type-check` — fix any type errors before committing
- [ ] Commit with a conventional commit message and push the branch

---

## Stack (quick reference)

```
Next.js 15 (App Router) · TypeScript (strict) · Supabase · shadcn/ui · Tailwind CSS
Vercel AI SDK · Assistant UI · Anthropic Claude API
papaparse (CSV) · Claude API native PDF support (PDF parsing — pass file as base64 document block, no extraction lib needed)
pnpm · ESLint · Prettier · Husky + lint-staged · Git + GitHub · Vercel
```

Full details in `docs/architecture.md`.

---

## Coding Conventions

- **TypeScript strict mode** — no `any`, no `@ts-ignore` without a comment explaining why
- **No direct `supabase` client in components** — all DB access goes through server actions or API routes
- **Amount handling** — always store as `amount_cents` (integer). Never floats for money.
- **Merchant names** — always normalise before storing or looking up (uppercase, strip trailing digits/card numbers). See `lib/parsers/normalise.ts`
- **Errors** — use typed error returns (`{ data, error }` pattern from Supabase), don't swallow errors silently
- **Components** — small and focused. If a component exceeds ~150 lines, split it
- **shadcn/ui always** — never use raw HTML equivalents (`<select>`, `<input>` outside of shadcn) when a shadcn component exists. shadcn `Select` doesn't wire to native form data — use a controlled `useState` + `<input type="hidden">` pattern when inside a server-action form
- **No `console.log` in committed code** — use `console.error` for genuine errors in server code only

---

## Git Conventions

- **Never commit directly to `main`** after the initial scaffold commit
- Feature branches: `feature/`, `fix/`, `chore/`, `docs/`, `refactor/`
- Conventional commit messages: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- One roadmap item = one branch = one PR
- Husky runs lint-staged on pre-commit — fix lint errors before committing, do not bypass the hook

---

## ADR Format

Create at `docs/decisions/NNN-{title}.md` (e.g. `docs/decisions/001-pdf-parsing-approach.md`):

```markdown
# ADR NNN: {Title}

Date: YYYY-MM-DD
Status: Accepted

## Context

Why did this decision need to be made?

## Decision

What was decided?

## Consequences

What are the trade-offs? What does this make easier or harder?
```

---

## Things Not To Do

- Don't start writing code before the plan file exists and is confirmed
- Don't add new dependencies without checking `docs/architecture.md` first
- Don't build features outside the current phase — check the roadmap
- Don't persist chat history to the DB (session-only by design — see roadmap)
- Don't implement direct bank API integration (far future — see roadmap)
- Don't add Axiom or other observability tooling yet
- Don't add tests in Phase 1–2 — add Vitest at Phase 3 for parsing/categorisation logic
- Don't bypass Husky hooks
