# Recurring Detection

**Date:** 2026-05-25  
**Branch:** feature/recurring-detection  
**Roadmap item:** Phase 3 — Recurring Transactions (build order item #12)

## Goal

Auto-detect recurring transactions by merchant pattern, add a manual flag toggle on any transaction, and display a "Fixed Costs" summary card on the dashboard.

## Approach

**Detection algorithm (server-side, no new DB columns):**

- Fetch all expense transactions with `merchant_name != null` for the household
- Group by `merchant_name`
- For each merchant: if it appears in 2+ distinct calendar months AND all occurrence amounts are within 10% of each other → mark all those transactions `is_recurring = true`
- Amount similarity: `(max_abs - min_abs) / max_abs <= 0.10`
- Transactions NOT meeting criteria are reset to `is_recurring = false` (clears stale flags)
- Triggered via a "Detect recurring" button on the transactions page (same pattern as RecategoriseButton)

**Manual toggle:**

- Server action `toggleRecurring(transactionId, newValue)` — simple boolean flip
- UI: small `RefreshCw` icon button in a new compact column in TransactionTable; highlighted (blue) when `is_recurring = true`

**Fixed Costs card:**

- Query: sum of `|amount_cents|` for `is_recurring = true` expense transactions in the selected month
- Show count of distinct recurring merchants alongside the total
- Added to dashboard page below the IncomeVsSpendCards row

**No new migrations needed** — `is_recurring boolean default false` already exists on `transactions`.

## Steps

- [x] Write plan file
- [x] `src/lib/actions/recurring.ts` — `detectRecurring()` and `toggleRecurring()` server actions
- [x] `src/lib/queries/recurring.ts` — `getFixedCostsSummary(month)` query
- [x] `src/components/transactions/DetectRecurringButton.tsx` — trigger detection
- [x] `src/components/transactions/RecurringBadge.tsx` — icon toggle per row
- [x] `src/components/dashboard/FixedCostsCard.tsx` — dashboard card
- [x] Update `src/components/transactions/TransactionTable.tsx` — add recurring column
- [x] Update `src/app/(app)/transactions/page.tsx` — add DetectRecurringButton
- [x] Update `src/app/(app)/dashboard/page.tsx` — add FixedCostsCard
- [x] `pnpm lint` + `pnpm type-check`
- [x] Commit + push + open PR

## Manual test steps

Happy path:

- [ ] Import transactions spanning 2+ months with the same merchant (e.g. a subscription). Click "Detect recurring" on the transactions page → confirm those transactions show the recurring icon highlighted.
- [ ] Click the recurring icon on a non-recurring transaction → confirm it turns blue (is_recurring toggled on).
- [ ] Click it again → confirm it turns off.
- [ ] Navigate to the dashboard → confirm the "Fixed Costs" card shows the correct monthly recurring total and merchant count.
- [ ] Switch month on dashboard → confirm Fixed Costs updates to that month's recurring total.

Edge cases:

- [ ] Merchant appears in only 1 month → not flagged as recurring after detection.
- [ ] Merchant appears in 2+ months but amounts vary >10% → not flagged.
- [ ] Month with no recurring transactions → Fixed Costs card shows $0.00 / 0 merchants.
- [ ] After detection, manually toggle a non-detected transaction to recurring → it should appear in Fixed Costs.

## Out of scope for this session

- Auto-running detection on each import (can be added later)
- Displaying recurring transactions in a separate dedicated view
- Category-level breakdown of fixed costs

---

<!-- Fill in below during/after the session -->

## What actually happened

- Detection algorithm implemented fully in `src/lib/actions/recurring.ts`. The batch update used `Promise.all([await update1, await update2])` to avoid TypeScript inference issues with Supabase's `PromiseLike` return type when using `.then()` chaining — the direct `await` approach resolves to a concrete `{ error }` shape that satisfies the type checker.
- `getFixedCostsSummary` uses the `monthDateRange` utility (already in `src/lib/utils/month.ts`) so it filters recurring transactions to the selected dashboard month, not all-time.
- `FixedCostsCard` placed between IncomeVsSpendCards and the chart/merchants grid on the dashboard — gives it a natural position as a "fixed baseline" before you see variable spend.
- `RecurringBadge` in TransactionTable uses a ghost icon button (`RefreshCw`) — blue when recurring, faded when not — placed in a compact dedicated column between Account and Amount.
- No new migrations needed — `is_recurring boolean default false` was already in schema.
- lint and type-check pass clean with zero warnings.

## Files created / modified

- `src/lib/actions/recurring.ts` — new: `detectRecurring()` (auto-detect by merchant pattern), `toggleRecurring()` (manual flip)
- `src/lib/queries/recurring.ts` — new: `getFixedCostsSummary(month)` query
- `src/components/transactions/DetectRecurringButton.tsx` — new: trigger auto-detect from transactions page
- `src/components/transactions/RecurringBadge.tsx` — new: per-row icon toggle
- `src/components/dashboard/FixedCostsCard.tsx` — new: dashboard card showing monthly recurring total
- `src/components/transactions/TransactionTable.tsx` — added RecurringBadge column
- `src/app/(app)/transactions/page.tsx` — added DetectRecurringButton
- `src/app/(app)/dashboard/page.tsx` — added FixedCostsCard and getFixedCostsSummary fetch
- `docs/work/2026-05-25-recurring-detection.md` — this plan file

## Deferred to next session

- Auto-running detection after each import (currently manual-trigger only — a future enhancement to wire `detectRecurring()` into the import action)
- Chat context injection for recurring/fixed costs data (build order item #14)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
