# Budget Auto-Seed from Previous Month

**Date:** 2026-05-25  
**Branch:** feature/budget-autoseed  
**Roadmap item:** Phase 3 — Budget management (refinement to build order item #11)

## Goal

When a user navigates to a month that has no budget rows, automatically copy budgets from the most recent month that does have budgets. The user sees pre-populated budgets immediately and can edit any amount. A subtle UI note indicates where the budgets came from.

## Approach

Keep the `budgets` table structure exactly as-is (`household_id, category_id, month, amount_cents`). No schema changes.

Auto-seeding runs server-side during the page render:

1. Fetch budget rows for the requested month.
2. If zero rows found, query `budgets` for the same household filtered to months before the requested month, ordered by `month DESC`, limit 1 distinct month — this gives the most recent month with any budget.
3. If a source month is found, insert a copy of those rows into the target month (using upsert so it's idempotent if somehow triggered twice).
4. Re-fetch the now-populated budget rows and pass `seededFrom: "YYYY-MM" | null` to the page component.
5. Render a dismissible info banner when `seededFrom` is set: _"Budgets auto-copied from May 2026 — edit any amount to override."_

If no previous month with budgets exists (first-ever use), the page shows the normal empty state ("No budget set" for each category) unchanged.

## Steps

- [ ] Write plan file ← this step
- [ ] Add `findMostRecentBudgetMonth(householdId, beforeMonth)` to `src/lib/queries/budgets.ts` — queries budgets for the household where `month < beforeMonth`, returns the highest month string or null
- [ ] Add `seedBudgetsFromMonth(householdId, sourceMonth, targetMonth)` to `src/lib/queries/budgets.ts` — fetches source month's budget rows and upserts them into target month; returns the count of rows inserted
- [ ] Update `src/app/(app)/budgets/page.tsx` — after fetching budgets for the month, if empty: call `findMostRecentBudgetMonth` → if found, call `seedBudgetsFromMonth` → re-fetch; pass `seededFrom` string down to the layout
- [ ] Add `SeededFromBanner.tsx` in `src/components/budgets/` — a small info callout (shadcn `Alert` with `Info` icon) that renders when `seededFrom` is set; dismissible client component (local state only, no persistence needed)
- [ ] Wire `SeededFromBanner` into the budgets page above the budget table
- [ ] `pnpm lint` + `pnpm type-check`
- [ ] Commit + push + open PR

## Manual test steps

**Happy path — auto-seed fires:**

- [ ] Ensure May 2026 has some budgets set (from previous session work)
- [ ] Navigate to `/budgets?month=2026-06` — page loads showing June, budgets are pre-populated with May's amounts, info banner reads "Budgets auto-copied from May 2026 — edit any amount to override"
- [ ] Edit one category's budget for June — dialog saves, row updates; the rest remain from May
- [ ] Navigate away and back to June — budgets persist (they're real rows now), banner does NOT reappear (seeded rows already exist)

**Edge case — no previous month exists:**

- [ ] On a fresh household with no budgets at all, navigate to any month — page shows the normal "No budget set" empty state, no banner, no error

**Edge case — idempotency:**

- [ ] Directly call the seed function twice for the same target month — upsert ensures no duplicate rows or errors

**Edge case — navigating backwards:**

- [ ] Go to a past month that already has budgets set — no seeding happens, no banner shown

## Out of scope for this session

- Any UI to explicitly "reset to defaults" or "clear this month's budgets"
- Rollover (unspent budget carries forward) — deferred in roadmap
- Per-category "default budget" concept — not needed; monthly copy achieves the same goal

---

<!-- Fill in below during/after the session -->

## What actually happened

- Shadcn `Alert` component was not yet installed — added via `pnpm dlx shadcn@latest add alert`.
- `findMostRecentBudgetMonth` uses a single Supabase query with `.lt('month', beforeMonth).order('month', { ascending: false }).limit(1).maybeSingle()` — simple and correct.
- `seedBudgetsFromMonth` fetches source rows then upserts with `ignoreDuplicates: true` — idempotent if called twice.
- Auto-seed runs server-side in the page component: fetch → if no budgets → find source → seed → re-fetch → pass `seededFrom` string to client.
- `SeededFromBanner` is a client component (needs `useState` for dismiss) wrapping shadcn `Alert` with a blue info palette and an `X` dismiss button.
- Pre-existing `.next/` type errors for stub admin/summary pages — confirmed not introduced by this change.

## Files created / modified

- `src/lib/queries/budgets.ts` — added `findMostRecentBudgetMonth` and `seedBudgetsFromMonth`
- `src/app/(app)/budgets/page.tsx` — auto-seed logic + `SeededFromBanner` import and render
- `src/components/budgets/SeededFromBanner.tsx` — new
- `src/components/ui/alert.tsx` — new (added via shadcn CLI)
- `docs/work/2026-05-25-budget-autoseed.md` — this file

## Deferred to next session

Nothing — feature complete as scoped.

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
