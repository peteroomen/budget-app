# Transfer exclusion across spend analysis (Phase 5 — Item C)

**Date:** 2026-05-27
**Branch:** feature/transfer-exclusion
**Roadmap item:** Phase 5 — Income awareness + transfer handling, **Item C**

## Goal

Stop transfers (savings moves, credit-card payments) from inflating spend totals.
With both spending + savings accounts imported, every savings transfer currently
counts twice (outgoing + incoming) and credit-card payments triple-count on top
of the actual purchases. After this session, totals across dashboard, budgets,
summary, and chat all exclude `type = 'transfer'` transactions.

## Approach

The schema groundwork is already done — `categories.type` exists and accepts
`'income' | 'expense' | 'transfer'` (PR #26). What's left:

1. **Seed two transfer-type system categories** — `Savings Transfer` and `Credit
Card Payment`. One small migration. No data backfill of existing transactions
   — users re-categorise via the UI (the AI prompt update below also helps new
   imports route correctly).
2. **Filter at the query layer**, not the component layer. Every aggregation
   that today walks a list of transactions gets a single `if (tx.category?.type
=== 'transfer') continue` early-out. Cheaper than filtering in SQL because
   most surfaces already need the category join.
3. **Surface them visually in the transaction list** — muted row + "Transfer"
   badge — so they're not invisible.
4. **Teach the AI categoriser** about both categories with NZ-specific examples,
   so new imports land in the right place automatically.

### What's _not_ changing

- `merchant_category_map` flow — transfers map and remember like any other
  category. Spec: "Merchant memory works as normal for transfers."
- `getBudgetsWithActuals` already filters categories by `type = 'expense'`, so
  transfer-type categories never appear in the budget table; actuals keyed by a
  transfer category id are silently dropped because no expense category reads
  them. **No change needed there.**
- Recurring _detection_ logic. We only filter the readers of `is_recurring`.

## Steps

### 1. Migration — seed transfer categories

- [ ] Create `supabase/migrations/20260527000001_seed_transfer_categories.sql`
  - Insert `Savings Transfer` (`type='transfer'`, `is_system=true`, colour
    `#7A8E84`) and `Credit Card Payment` (`type='transfer'`, `is_system=true`,
    colour `#8C8E94`) for every household
  - `ON CONFLICT (household_id, name) DO NOTHING` — idempotent
- [ ] Run migration locally (Supabase Studio SQL editor)
- [ ] Update `docs/schema/current.md` — bump migration cursor, note the two new
      seeded system rows

### 2. Dashboard aggregation — `src/lib/queries/dashboard.ts`

- [ ] In the totals loop (currently `for (const t of transactions)`): skip rows
      where `t.category?.type === 'transfer'` for both `income_cents` and
      `spend_cents`
- [ ] In `byCategory` loop: same skip — transfers don't appear in the chart
- [ ] In `topMerchants` loop: same skip — transfers don't appear in top
      merchants
- [ ] `received_income_cents` already gated by `type === 'income'`, no change

### 3. Summary aggregation — `src/lib/queries/summary.ts`

- [ ] Current month: skip transfer rows in totals, `actualMap` (byCategory), and
      `merchantMap` (topMerchants)
- [ ] Prior month: the query currently selects `category:categories(name)` — extend
      to `category:categories(name, type)`, update `PriorTxRow` type, then skip
      transfer rows in `priorMonthSpend` + `priorActualMap`

### 4. Chat context — `src/lib/queries/chat-context.ts`

- [ ] `currentTransactions`: drop rows where category type is `'transfer'`
      (rawTx already selects `type`)
- [ ] `actualMap` (budget vs actual): skip transfer rows
- [ ] `allCategoryNames`: filter the categories query to `type != 'transfer'`
      so Claude doesn't see transfer categories listed with $0 in the budget block
- [ ] Trend query: add `type` to the select, skip transfer rows in `trendMap`
- [ ] Recurring query: add a join + skip transfer rows (so "Total fixed costs"
      doesn't include CC-payment recurrence)

### 5. Fixed costs card — `src/lib/queries/recurring.ts`

- [ ] Extend the select to include `category:categories(type)`
- [ ] Filter transfer rows out before computing `total_cents` and
      `merchant_count`

### 6. AI categoriser — `src/lib/categorise.ts`

- [ ] Add category guidance lines for both transfer categories:
  - `Savings Transfer`: transfers from spending to your own savings/investment
    accounts (e.g. "Transfer to Savings", "TO 12-3456-7890123-00")
  - `Credit Card Payment`: payments from a spending account to your own credit
    card (e.g. "ANZ CC PAYMENT", "Visa Payment Thank You")
- [ ] Add one NZ example to the few-shot demonstrating each:
  - `5: TRANSFER TO SAVINGS → Savings Transfer`
  - `6: ANZ VISA PAYMENT → Credit Card Payment`

### 7. Transaction list — muted styling + "Transfer" badge

- [ ] `src/lib/queries/transactions.ts`: extend the category select to
      `category:categories(name, type)` and update `TransactionRow.category` to
      `{ name: string; type: string } | null`
- [ ] `src/components/transactions/TransactionTable.tsx`:
  - When `tx.category?.type === 'transfer'`: row gets `text-muted-foreground`
    (whole row dim) and a `Badge variant="outline"` with text "Transfer" inline
    with merchant
- [ ] `src/components/transactions/TransactionDayList.tsx`:
  - Same muted treatment for the row; small "Transfer" pill under the merchant
    name (similar to where the category label sits)
  - Day-spend total at the top of each group: skip transfer rows so the day
    spend matches what dashboard/summary report

### 8. Roadmap + Current State

- [ ] Check off Item C in `docs/roadmap.md`
- [ ] Update **Current State** section of `CLAUDE.md` (open PRs note is already
      stale — refresh it: no open PRs, Item C just shipped; remaining work)

### 9. Verification

- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] Manual tests below

## Manual test steps

### Seed migration

- [ ] After applying migration: query `categories where type = 'transfer'` —
      exactly two rows per household, names "Savings Transfer" and "Credit Card
      Payment"

### Categorise transfers manually

- [ ] Find a real savings transfer in transactions list — change its category
      to "Savings Transfer" via the dropdown
- [ ] Find a credit-card payment — change category to "Credit Card Payment"

### Dashboard

- [ ] Before re-categorising, note the month's "Total spent" on dashboard
- [ ] After re-categorising the transfer pair: "Total spent" drops by the
      outgoing-side amount; income card also drops by the incoming-side amount
- [ ] Category chart: neither transfer category appears as a slice
- [ ] Top merchants: the transfer destination/source no longer shows up
- [ ] **Edge case:** a transfer txn where merchant_name is null and description
      is e.g. "TRANSFER" — still excluded (we filter on type, not merchant)

### Budgets

- [ ] Budgets table: neither "Savings Transfer" nor "Credit Card Payment"
      appears as a row (already filtered to `type='expense'` by PR #26)
- [ ] "Total spent" KPI matches dashboard's "Total spent"
- [ ] Existing "Savings" expense category is untouched (its budget + actuals
      still render — only transfers excluded, not the historical Savings category)

### Summary

- [ ] Regenerate summary for current month
- [ ] Recap "Total spend" and category list omit the transfer categories
- [ ] vs-prior-month comparison still works (prior-month numbers should also
      exclude transfers, even if prior-month txns aren't recategorised yet —
      consistency: both sides count by current category type)

### Chat

- [ ] Open `/chat`, ask: "How much did we spend this month?" → number matches
      the dashboard total (transfers excluded)
- [ ] Ask: "What recurring payments do we have?" → list doesn't include CC
      payments (if you've flagged one as recurring)
- [ ] Ask: "Did we transfer to savings this month?" → Claude may not have
      visibility (transactions list excludes transfers by design) — acceptable, but
      worth confirming the UX feels right

### Transaction list

- [ ] Re-categorised transfer rows show with muted text + "Transfer" badge
- [ ] Mobile (`TransactionDayList`): muted treatment + Transfer pill visible;
      day-spend total at top of group excludes the transfer

### AI categorisation on new import

- [ ] Import a fresh CSV (or use admin → re-categorise-all on a small slice)
- [ ] A line like "TFR TO SAVINGS" should land in "Savings Transfer"
- [ ] A line like "ANZ VISA PAYMENT" should land in "Credit Card Payment"

## Out of scope for this session

- **Backfill** — no automated re-categorisation of existing transfer-shaped
  transactions. User does this manually via the UI; new imports get it right via
  the AI prompt update.
- Per-month income overrides (Income awareness future enhancement)
- Detection logic for "this looks like a transfer but isn't categorised yet" —
  could flag as a Phase 5 polish item but not today.
- Summary "Regenerate" button (still on the backlog).

---

## What actually happened

Mid-plan adjustment after user feedback: instead of seeding two brand-new
transfer categories (`Savings Transfer` + `Credit Card Payment`), the migration
**renames the existing `Savings` system category → `Savings Transfer` and flips
its type to `transfer`**. The user hates credit cards, so `Credit Card Payment`
is intentionally not seeded. Personal-account transfers stay as user-defined
custom categories — which they now can do because the category create/edit
dialogs gained a **Type picker** (income / expense / transfer). The
`createCategory` and `updateCategory` server actions parse and persist `type`;
unknown / missing values fall back to `expense` on create and don't touch the
column on update.

Budget rows tied to the old "Savings" category are deleted by the migration —
otherwise `seedBudgetsFromMonth` would keep copying them into future months
where they'd be silently filtered out by the `type='expense'` constraint on the
budgets table.

The `getBudgetsWithActuals` query is unchanged: it already filters categories
to `type='expense'`, so transfer-typed actuals are silently dropped when the
result is keyed back against the category list. No extra work needed there.

## Files created / modified

- `supabase/migrations/20260527000001_savings_to_transfer.sql` — **new**: rename
  Savings → Savings Transfer, flip type to transfer, drop old budget rows
- `src/lib/actions/categories.ts` — accept + persist `type` on create/update
- `src/components/categories/AddCategoryDialog.tsx` — Type picker (shadcn Select
  - hidden input, controlled via `useState`)
- `src/components/categories/EditCategoryDialog.tsx` — Type picker, defaults to
  the category's existing type
- `src/components/settings/CategoriesContent.tsx` — new Type column showing
  income/expense/transfer; existing Default/Custom column renamed to "Origin"
- `src/lib/queries/dashboard.ts` — skip `type='transfer'` in totals,
  `byCategory`, `topMerchants`
- `src/lib/queries/summary.ts` — skip transfers in current totals/categories/top
  merchants and prior-month spend + categories (extended `category` select to
  include `type`)
- `src/lib/queries/chat-context.ts` — drop transfers from `currentTransactions`,
  `actualMap`, `trendMap`, `recurringMap`; filter `categories` query to
  `type != 'transfer'` so Claude doesn't see them in the budget block
- `src/lib/queries/recurring.ts` — skip transfers in fixed-costs total +
  merchant count
- `src/lib/categorise.ts` — guidance line + NZ example for Savings Transfer
- `src/lib/queries/transactions.ts` — extended `TransactionRow.category` with
  `type` (for the UI badge)
- `src/components/transactions/TransactionTable.tsx` — muted row + outline
  "Transfer" badge inline with merchant name
- `src/components/transactions/TransactionDayList.tsx` — muted row + Transfer
  badge; day-spend total excludes transfers
- `docs/roadmap.md` — tick Item C
- `docs/schema/current.md` — bump migration cursor + note on Savings rename
- `CLAUDE.md` — Current State refresh (this session, stale open-PRs cleared)

## Deferred to next session

- Backfill of historical Savings-categorised transactions: they now sit under
  Savings Transfer with type=transfer automatically (no row change needed —
  same category id). But pre-Savings rows that were lumped into "Other" or a
  custom name aren't touched.
- Detection prompt / passive flagging when a transaction looks like a transfer
  but isn't categorised as one.
- Summary "Regenerate" button.

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
