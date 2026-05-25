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

- **Current phase:** Phase 4 — AI Chat (in progress). Phases 1–3 fully complete.
- **Last session:** 2026-05-25 — Recurring detection (build order item #12, PR #15 open for review)
- **All merged to main (build order items #1–#14):**
  - #1 Scaffold · #2 Auth + household · #3 Accounts CRUD
  - #4 CSV import · #5 PDF import · #6 Transaction list
  - #7 Category system · #8 Merchant memory · #9 AI categorisation
  - #10 Dashboard charts · #11 Budget management
  - #13 Chat interface (Assistant UI + Vercel AI SDK, streaming, markdown rendering)
  - #14 Chat context injection — `src/lib/queries/chat-context.ts` fetches transactions, budgets, categories, 3-month trends, and recurring; injected as a structured `<financial_data>` block in the system prompt
- **In review (PR #15 — feature/recurring-detection):**
  - #12 Recurring detection — auto-detect by merchant pattern (2+ months, ≤10% amount spread), manual toggle per row, Fixed Costs dashboard card. Also: dashboard loading skeleton, month-change Suspense, "This month" link, admin future-month navigation, all 4 summary cards in one row.
- **Remaining build order items:**
  - **#15** Monthly summary — Claude-generated recap page (Phase 5)
  - **#16** Polish pass — responsive, dark mode, empty states, search, export (Phase 5)
- **Deferred from #12 (not blocking):**
  - Auto-run recurring detection after each import (currently manual-trigger only)
- **Deferred Phase 2 refinements (not blocking, nice to have):**
  - `category_source` column on `transactions` — track 'claude' vs 'manual' overrides
  - `is_manual` flag on `merchant_category_map` — so "Re-categorise all" preserves manual overrides
- **Known issues:** Node 22 required — always `source ~/.nvm/nvm.sh && nvm use 22` before pnpm scripts.
- **New components added in #12:** `src/lib/actions/recurring.ts`, `src/lib/queries/recurring.ts`, `src/components/ui/tooltip.tsx`, `src/components/ui/skeleton.tsx`, `src/app/(app)/dashboard/DashboardContent.tsx`, `src/app/(app)/dashboard/loading.tsx`.

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
