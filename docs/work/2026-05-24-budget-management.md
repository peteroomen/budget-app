# Budget Management

**Date:** 2026-05-24  
**Branch:** feature/budget-management  
**Roadmap item:** Phase 3 — Budget management (build order item #11)

## Goal

A user can view and set monthly budgets per category at `/budgets`, see a progress bar (green → amber → red) for each category's actual spend vs budget, and spot over-budget categories via callout cards at the top.

## Approach

- **`budgets` table already exists** — `(household_id, category_id, month, amount_cents)` with unique constraint on `(household_id, category_id, month)`. No migration needed.
- **Month selector** — URL search param `?month=YYYY-MM`; client component with prev/next buttons; defaults to current month server-side.
- **Data fetching** — one query fetches all categories + their budget row for the month (left join); a second query aggregates actual spend by category (SUM of negative amount_cents) for the month. Both run server-side.
- **Progress bar** — inline div-based bar with Tailwind colour classes; green < 75%, amber 75–99%, red ≥ 100%.
- **Set/edit budget dialog** — `useActionState` pattern matching categories page; upsert via Supabase `upsert()` with `onConflict: 'household_id,category_id,month'`.
- **Over-budget callout cards** — rendered above the table when any category exceeds its budget.
- Amounts stored/handled as `amount_cents` (integers) throughout; display formatted as NZD.

## Steps

- [x] Write plan file
- [x] `src/lib/queries/budgets.ts` — `getBudgetsWithActuals(month)`: fetches all categories, left-joins budget row, aggregates actuals from transactions
- [x] `src/lib/actions/budgets.ts` — `upsertBudget(prevState, formData)`: server action, upserts budget row
- [x] `src/components/budgets/MonthPicker.tsx` — client component: displays MMMM YYYY, prev/next buttons push URL param
- [x] `src/components/budgets/SetBudgetDialog.tsx` — client dialog: NZD input, hidden category_id + month fields, useActionState, inline error
- [x] `src/components/budgets/BudgetProgressBar.tsx` — server component: coloured progress bar with percentage
- [x] `src/components/budgets/OverBudgetCards.tsx` — server component: grid of callout cards for over-budget categories
- [x] `src/app/(app)/budgets/page.tsx` — replace stub: reads `month` searchParam, fetches data, renders MonthPicker + callout cards + budget table
- [x] `pnpm lint` + `pnpm type-check`
- [x] Commit + push + open PR

## Manual test steps

- [ ] Navigate to `/budgets` — page loads showing current month (e.g. "May 2026"), all categories listed, no budgets set yet
- [ ] Click "Set budget" on a category, enter an amount, save — budget appears in the row
- [ ] Edit an existing budget — amount updates in place
- [ ] Set budget for "Groceries" at $200, add transactions totalling ~$150 — progress bar shows green ~75%
- [ ] Spend more until ~$170 — bar turns amber
- [ ] Exceed budget — bar turns red, category appears in the over-budget callout at the top
- [ ] Navigate to previous month with the prev button — URL updates, data changes accordingly
- [ ] Category with no transactions and no budget — shows $0 actual, no bar, "Set budget" button
- [ ] Edge case: category with actual spend but no budget set — shows actual spend, no bar rendered (nothing to compare against)

## Out of scope for this session

- Rollover toggle (Phase 3b — roadmap explicitly defers this)
- Dashboard integration (over-budget cards on dashboard — Phase 3)
- Budget alerts / notifications (Phase 5)
- Pagination or search within budget list

---

## What actually happened

- `getBudgetsWithActuals` runs two Supabase queries: one for categories + budget rows (left join pattern via separate query and manual merge), one for transaction actuals aggregated by category_id. Merged in-server before returning.
- Supabase JS client doesn't support aggregation in `.select()` so actuals are computed with a raw `.select('category_id, amount_cents')` then summed in TypeScript.
- Progress bar implemented as inline `<div>` with dynamic width percentage and Tailwind colour classes — no extra shadcn component needed.
- Amount input uses a controlled dollar (NZD) input that converts to cents before submitting via a hidden field; avoids float issues.
- Month navigation uses `useSearchParams` + `useRouter.push` in `MonthPicker`.
- Over-budget cards rendered conditionally above the budget table.
- Upsert uses `onConflict: 'household_id,category_id,month'` — Supabase `.upsert()` with `ignoreDuplicates: false`.

## Files created / modified

- `src/lib/queries/budgets.ts` — new
- `src/lib/actions/budgets.ts` — new
- `src/components/budgets/MonthPicker.tsx` — new
- `src/components/budgets/SetBudgetDialog.tsx` — new
- `src/components/budgets/BudgetProgressBar.tsx` — new
- `src/components/budgets/OverBudgetCards.tsx` — new
- `src/app/(app)/budgets/page.tsx` — replaced stub

## Deferred to next session

- Recurring detection (build order item #12)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
