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

**Test data:** use the three files in `test-data/` — import all three to the same account (create a checking account first if needed):

1. `test-data/anz-may-2026.csv`
2. `test-data/anz-june-2026.csv`
3. `test-data/anz-july-2026.csv`

> `anz-sample.csv` also exists but overlaps with May dates — skip it for this test.

---

### Happy path

- [ ] Import all three CSVs above to the same account via `/import`
- [ ] Navigate to `/transactions` → click **"Detect recurring"**
- [ ] Confirm exactly these **10 merchants** have a blue recurring icon on their rows:
  - NETFLIX ($22.99 — identical across all months)
  - SPOTIFY ($11.99 — identical)
  - DISNEY PLUS ($15.99 — identical)
  - ANZ HOMELOAN ($1,250.00 — identical)
  - ELC PAPAKURA ($620.00 — identical)
  - IAG INSURANCE ($185.00 — identical)
  - VODAFONE NZ ($79.00 — identical)
  - GENESIS ENERGY ($143/138.50/151 — 8.3% spread, within 10%)
  - Z ENERGY TAKANINI ($95/91/96 — 5.2% spread)
  - BP TAKANINI ($88/85.50/92 — 7.1% spread)
- [ ] Navigate to `/dashboard` → set month to **July 2026** → Fixed Costs card should show **$2,523.97** / 10 recurring merchants
- [ ] Switch to **June 2026** → Fixed Costs card should show **$2,499.97** / 10 recurring merchants
- [ ] Switch to **May 2026** → Fixed Costs card should show **$2,510.97** / 10 recurring merchants

### Manual toggle

- [ ] Find a HELL PIZZA PAPAKURA row (should have a faded icon — not recurring) → click its icon → confirm it turns blue
- [ ] Dashboard → May 2026 → Fixed Costs should now show **$2,552.97** (added $42.00) / 11 merchants
- [ ] Click the HELL PIZZA icon again → confirm it reverts to faded
- [ ] Dashboard → May 2026 → Fixed Costs should drop back to $2,510.97 / 10 merchants

### Edge cases

- [ ] **Single month only:** AMAZON PRIME ($8.99) appears only in May → icon should be faded after detection (not flagged — only one month)
- [ ] **Amounts >10% apart:** PAKNSAVE PAPAKURA normalises to the same name across all three months (card numbers stripped) with amounts $112.87/$104.62/$119.40 — that's a 12.4% spread → should NOT be flagged
- [ ] **Just over 10%:** DOMINO'S PIZZA PAPAKURA appears in June ($31.90) and July ($35.90) — 11.1% spread → should NOT be flagged
- [ ] **Empty month:** navigate to a month with no imported data (e.g. April 2026) → Fixed Costs card shows $0.00 / "No recurring transactions detected"

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
