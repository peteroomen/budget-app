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
- **Last session:** 2026-05-30 — Import summary preview/confirm flow (Build order #17, PR #32). Split `importStatement` into `analyseImport` + `commitImport`. New `import_history` table (migration `20260529000000`). Three-step UI: upload form → preview stats (New/Duplicates/From memory/From Claude/Uncategorised) → success. Merchant map written at commit time only. "Recent imports" card on import page. See `docs/work/2026-05-29-import-summary.md`.
- **Previous sessions (all merged):**
  - 2026-05-29 — Month picker enhancement (PR #31). New `MonthJumpPopover` shared component (`src/components/ui/month-jump-popover.tsx`); replaces the static month label in `SummaryMonthSelector` and `MonthPicker` with a clickable trigger that opens a year+month grid Popover. Dashboard uses new `DashboardMonthNav` (H1 as the popover trigger, flanked by prev/next arrows — replaces the old separate `MonthSelector` widget). `allowFuture` controls whether future months are enabled. See `docs/work/2026-05-29-month-picker-enhancement.md`.
  - 2026-05-28 — Multi-household membership + profile-chip switcher (PR #30). New `household_members` join table; `profiles.household_id` as active pointer; `get_my_household_id()` validates membership; `create_household(text)` RPC; `switchHousehold` server action; sidebar/drawer profile chip with household switcher + create + settings. See `docs/work/2026-05-28-multi-household.md`.
  - 2026-05-27 — Transaction notes UI + Claude awareness (PR #28). New `setTransactionNote` server action + `NotePopover` (shadcn Popover + Input + sonner toast). Desktop = hover-revealed pencil when no note, inline pencil next to italic note line when set; mobile = always-visible pencil next to merchant. Notes injected as `— note: …` per transaction in chat context and as a "Transactions with notes" section in the summary prompt. See `docs/work/2026-05-27-transaction-notes-ui.md`.
  - 2026-05-27 — Transfer exclusion (Phase 5 Item C, PR #29). `Savings` → `Savings Transfer`, `type='transfer'`; transfers excluded from dashboard totals, summary, chat context, recurring, fixed costs. Category Type picker in create/edit dialogs. See `docs/work/2026-05-27-transfer-exclusion.md`.
  - 2026-05-27 — Projected income (Phase 5 Items A + B, PR #26). `categories.type`, `households.expected_monthly_income_cents`, Household settings tab, AllocationPanel on budgets, income-vs-expected + spend-vs-budgeted dashboard cards, income injected into chat + summary context. See `docs/work/2026-05-27-projected-income.md`.
  - 2026-05-27 — Per-row transaction delete (PR #27). `deleteTransaction` server action + `DeleteTransactionButton` with Dialog confirm + sonner toast. Desktop = hover-revealed trash; mobile = always-visible. See `docs/work/2026-05-27-tx-row-delete.md`.
  - 2026-05-26 — Vercel edge middleware hotfix (PR #25 + manual deploy). Fixed `MIDDLEWARE_INVOCATION_FAILED` / `ReferenceError: __dirname`. Production healthy: `dpl_6axT7v2xMMvzBqm2iXQc9XW13ptK`.
  - 2026-05-24 — Thorough mobile nav (PR #24). Bottom sheet drawer, tab bar, viewport fixes.
- **All merged to main (build order + extras — PRs #1–#29):**
  - #1 Scaffold · #2 Auth + household · #3 Accounts CRUD
  - #4 CSV import · #5 PDF import · #6 Transaction list
  - #7 Category system · #8 Merchant memory · #9 AI categorisation
  - #10 Dashboard charts · #11 Budget management
  - #12 Recurring detection — auto-detect, manual toggle, Fixed Costs card
  - #13 Chat interface — Assistant UI + Vercel AI SDK, streaming, markdown
  - #14 Chat context injection — transactions, budgets, categories, 3-month trends, recurring
  - #15 Monthly summary — Claude-generated recap page
  - #16 Polish pass — skeletons (6 pages), empty states, mobile overflow, accessibility
  - category_source + is_manual tracking columns
  - Admin page — `/admin` (role-gated), delete-all-transactions + delete-all-merchant-mappings
  - Budget auto-seed — auto-copy from previous month; dismissible Alert banner
  - Nav/layout restructure — sidebar primary/secondary split, mobile bottom tab bar + Sheet drawer
  - Tide design system (PRs #21 + #22 + #23) — CSS tokens, dark mode, Fraunces + JetBrains Mono, per-page passes, import dropzone, chat chips, budget KPI stats, summary compare bars, sidebar dark-mode row + sign-out, `TIDE_ANTHROPIC_API_KEY` fix
  - Thorough mobile nav (PR #24) — bottom sheet drawer, tab bar, viewport fixes
  - Mobile bugfixes (PR #25)
  - Projected income (PR #26) — Phase 5 Items A + B: `categories.type`, declared income, allocation panel, dashboard cards, chat/summary context
  - Per-row transaction delete (PR #27)
  - Transaction notes UI + Claude awareness (PR #28) — `NotePopover`, notes in chat + summary context
  - Transfer exclusion (PR #29) — Phase 5 Item C: `type='transfer'`, excluded from all spend aggregation, Type picker in category UI
  - Multi-household membership + profile-chip switcher (PR #30) — `household_members` join table, `create_household` RPC, `switchHousehold` action, sidebar/drawer profile chip
  - Month picker enhancement (PR #31) — `MonthJumpPopover`, `DashboardMonthNav`, year+month grid popover on dashboard/budgets/summary
  - Import summary preview/confirm (PR #32, build order #17) — `import_history` table, `analyseImport` + `commitImport` actions, 3-step UI, "Recent imports" card
- **Open PRs:**
  - **PR #32** `feature/import-summary` — import preview/confirm flow + import_history table (merging now)
- **Vercel / build config (main branch):**
  - `vercel.json`: `buildCommand: "pnpm run build"`, `outputDirectory: ".next"` (resolves to `src/.next` from Vercel's `src/` framework root)
  - `next.config.ts`: `distDir: 'src/.next'` + `NormalModuleReplacementPlugin` replacing `testmode/context.js` with noop for edge runtime
  - `scripts/patch-testmode.js`: prebuild that overwrites `node_modules/next/dist/experimental/testmode/context.js` with a noop (busts webpack cache on Vercel)
  - `eslint.config.mjs`: `{ ignores: ['src/.next/**'] }` prevents linting of build artifacts
  - Next.js `15.5.18` — do NOT downgrade; 15.3.3 is Vercel-blocked for CVE
- **Remaining build order items:**
  - ~~**#17** Import summary~~ — shipped in PR #32. All 17 build order items now complete.
- **Deferred (not blocking):**
  - Auto-run recurring detection after each import (currently manual-trigger only)
  - Summary "Regenerate" button
  - Dashboard bottom row (recent transactions + quick actions)
  - Header search, notification bell (roadmapped, not built yet)
  - Set `TIDE_ANTHROPIC_API_KEY` in Vercel project env before deploying to production
- **Known issues:** Node 22 required — always `source ~/.nvm/nvm.sh && nvm use 22` before pnpm scripts.
- **Components available:** `Skeleton`, `Tooltip`, `Avatar`, `Sheet`, `Badge`, `Switch`, `Popover`, `MonthJumpPopover` (all in `src/components/ui/`). `Textarea` is **not** installed — single-line `Input` is used for notes.
- **Prop convention:** `SummaryMonthSelector`, `MonthPicker`, and `MonthJumpPopover` use `allowFuture` (not `isAdmin`) — the page passes `allowFuture={isAdmin}` so the selector stays role-agnostic. `DashboardMonthNav` still accepts `isAdmin` (converts internally to `allowFuture`).
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
