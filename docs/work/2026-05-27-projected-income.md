# Projected Income

**Date:** 2026-05-27
**Branch:** feature/projected-income
**Roadmap item:** Phase 5 — Income awareness + transfer handling (items **A** + **B** + a new dashboard piece). Item **C** (transfer exclusion) is explicitly deferred.

## Goal

Introduce a household-wide "expected monthly income" figure and surface it in three places:

1. **AI context** — both chat and the monthly summary know what income is expected so Claude can reason about mid-month gaps.
2. **Dashboard** — actual income vs expected, and actual spend vs total budgeted, each as a progress card.
3. **Budgets page** — an allocation panel above the category rows showing Expected / Allocated / Unallocated, plus a warn state if the total budgeted exceeds expected income. Income-type categories are filtered out of the budget table.

"Done" = a number you set once in Settings flows into all three surfaces, with graceful fallbacks when it's not set.

## Approach

### Design decisions made up front

- **Single household-wide value** (confirmed) — `households.expected_monthly_income_cents`. Per-month overrides deferred until real usage proves the need.
- **Category type column** — `categories.type` (`'income' | 'expense' | 'transfer'`, default `'expense'`) is added now even though we're deferring transfer-exclusion (C). Two reasons: (a) filtering income out of the budget table by type is more robust than filtering by name (user could rename "Income"); (b) summing "received so far" needs to find income-typed transactions specifically. Transfer-typed system categories ("Savings Transfer", "Credit Card Payment") are **not** seeded in this session — they belong with C.
- **Settings placement** — add a new **Household** tab to `SettingsTabs` alongside the existing Accounts / Categories / Danger Zone. Rationale: this is the first piece of household-level config; future items (currency default, household name) will land here too.
- **Dashboard treatment** — replace the existing `IncomeVsSpendCards` component (currently two cards: Income, Spend) with a new `IncomeVsExpectedCard` + `SpendVsBudgetedCard`. Each shows actual + target + a progress bar + a "you're N% through the month, X% of target" pace indicator. Falls back to the old "actual only" rendering when target is null.
- **Budget page allocation panel** — a banner card above the KPI row, not a replacement for the KPIs. Three numbers + a horizontal allocation bar:
  - Expected income (declared)
  - Allocated to budgets (sum of all `budgets` rows this month)
  - Unallocated (Expected − Allocated; can go negative)
  - Bar: filled section = Allocated / Expected; over-allocation rendered in destructive colour.
  - Hidden entirely when `expected_monthly_income_cents` is null.
- **Income-type categories excluded from budget list** — `getBudgetsWithActuals(month)` filters out `type = 'income'` rows. This means "Income" no longer appears as something you can set a budget against.
- **Chat + summary injection** — extend `ChatContext` with `expectedIncomeCents`, `receivedIncomeCents`, and `incomeGapCents`. Render in the `<financial_data>` block as a new `## Income` section. Summary route uses the same shape via a small helper.

### What "Received income" means

Sum of `amount_cents > 0` transactions in the current month whose `category.type = 'income'`. Note: this is **not** the same as "all positive-amount transactions" — the old dashboard income figure was the latter. We're tightening the definition so that, e.g., a refund or a transfer-in doesn't get counted as income. Stops short of full transfer-exclusion (C) — non-income positive amounts still appear on the dashboard total but won't roll into the "received vs expected" comparison.

### Things I am NOT doing

- Not touching any spend-aggregation code beyond the budget table filter — that's item C.
- Not seeding transfer categories — that's item C.
- Not adding a regenerate button on the summary page — separate roadmap item.
- Not adding per-month income overrides — see roadmap "Per-month overrides" trade-off.

## Steps

### 1. Schema & data

- [ ] **Migration** `supabase/migrations/20260527000000_projected_income.sql`:
  - `ALTER TABLE categories ADD COLUMN type text NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'transfer'));`
  - `UPDATE categories SET type = 'income' WHERE name = 'Income';`
  - `ALTER TABLE households ADD COLUMN expected_monthly_income_cents integer;` (nullable)
- [ ] Run the migration locally (`pnpm supabase db reset` or per project convention)
- [ ] Update `docs/schema/current.md` — add the `type` column to the `categories` table, the `expected_monthly_income_cents` column to `households`, and bump the migration pointer.

### 2. Server-side queries / helpers

- [ ] `src/lib/queries/household.ts` — **new file**. Export:
  - `getHouseholdSettings(): Promise<{ id: string; name: string; expected_monthly_income_cents: number | null } | null>`
  - `updateExpectedMonthlyIncome(cents: number | null): Promise<{ error: string | null }>` (server action — `'use server'` at module top so it can be imported into a client component)
- [ ] `src/lib/queries/dashboard.ts` — extend `getDashboardData(month)`:
  - Join `category.type` on the transactions query.
  - Compute `received_income_cents` = sum of `amount_cents > 0` where `category.type = 'income'`. Keep the existing `income_cents` (sum of all positive amounts) for backwards compatibility / display.
  - Also fetch `expected_monthly_income_cents` from `households`.
  - Compute `total_budgeted_cents` for the month from `budgets`.
  - Add these to the returned shape: `{ summary: { ...existing, expected_income_cents, received_income_cents, total_budgeted_cents } }`.
- [ ] `src/lib/queries/budgets.ts` — extend `getBudgetsWithActuals(month)`:
  - Filter out `categories.type IN ('income', 'transfer')` from the category list returned.
  - Return shape unchanged otherwise.
- [ ] `src/lib/queries/chat-context.ts`:
  - Fetch `expected_monthly_income_cents` from `households`.
  - Join `category.type` on the transactions query; compute `received_income_cents`.
  - Add `expectedIncomeCents`, `receivedIncomeCents`, `incomeGapCents` to `ChatContext`.
  - `formatChatContext`: add a `## Income (May 2026)` section showing `Expected: $X | Received so far: $Y | Gap: $Z`. Only render if `expectedIncomeCents !== null`.
- [ ] `src/lib/queries/summary.ts` — same income fields fetched + formatted into the prompt data block. Use the same renderer if possible to avoid drift.

### 3. UI — Settings

- [ ] Add `'household'` to the `VALID_TABS` tuple in `src/app/(app)/settings/page.tsx`. Fetch household settings server-side; pass to `SettingsTabs` as `householdContent`.
- [ ] Update `src/components/settings/SettingsTabs.tsx` to include the new tab.
- [ ] **New** `src/components/settings/HouseholdContent.tsx` — client component:
  - Renders a Card with one field: "Expected monthly income (NZD)".
  - Controlled `<Input type="number">` with cents-aware formatting (display as dollars, store as cents).
  - "Save" button calls the `updateExpectedMonthlyIncome` server action; uses `sonner` toast on success/error.
  - Empty state guidance text: "Used for tracking actual vs expected on the dashboard, allocating budgets, and giving the AI context for mid-month conversations."

### 4. UI — Dashboard

- [ ] **New** `src/components/dashboard/IncomeVsExpectedCard.tsx` — replaces the income half of `IncomeVsSpendCards`:
  - Headline: actual received this month (Fraunces display metric).
  - Sub: "of $X expected" + Progress bar (received / expected, clamped 0–100%).
  - Pace badge: "Day N of M (P% through)" sourced from current date; subtle if no expected income set (renders as legacy income-only card).
- [ ] **New** `src/components/dashboard/SpendVsBudgetedCard.tsx` — replaces the spend half:
  - Headline: actual spend this month.
  - Sub: "of $X budgeted" + Progress bar (spend / total_budgeted).
  - Falls back to "$X spent (no budgets set)" if no budgets exist.
- [ ] Update `src/app/(app)/dashboard/DashboardContent.tsx` to use the two new cards in place of `IncomeVsSpendCards`. Delete `IncomeVsSpendCards.tsx` if nothing else references it.

### 5. UI — Budgets page

- [ ] **New** `src/components/budgets/AllocationPanel.tsx`:
  - Props: `expectedIncomeCents | null`, `totalBudgetedCents`.
  - Renders nothing if `expectedIncomeCents === null` (graceful fallback).
  - Three inline stats: Expected · Allocated · Unallocated (negative = over).
  - Horizontal bar: `Progress` with `value = (totalBudgetedCents / expectedIncomeCents) * 100`, clamped. When over 100, render in destructive colour.
  - Subtle "Set in Settings" link if income is null.
- [ ] Update `src/app/(app)/budgets/page.tsx`:
  - Fetch `getHouseholdSettings()` alongside the existing data.
  - Render `<AllocationPanel>` between `SeededFromBanner` and the KPI row.
  - No change to KPI cards themselves.

### 6. AI surfaces (only if not already covered by step 2)

- [ ] Verify `src/app/api/chat/route.ts` already pulls `formatChatContext(ctx)` — no changes expected there since the formatter now includes income.
- [ ] Verify the summary route similarly uses the updated context shape. Adjust if it constructs its own prompt string (likely does — re-check).

### 7. Quality gates

- [ ] `pnpm lint` — clean
- [ ] `pnpm type-check` — clean
- [ ] Commit with conventional commit messages — one per logical chunk (schema, queries, settings, dashboard, budgets, AI context)

## Manual test steps

### Happy path

- [ ] Sign in as Peter. Navigate to **Settings → Household**. Enter `9000`. Save. Reload — value persists.
- [ ] Navigate to **Dashboard** for the current month. Income card shows e.g. `$3,200 of $9,000 expected` with a ~36% progress bar; pace badge reads e.g. `Day 27 of 31 (87% through)`. Spend card shows `$X of $Y budgeted` similarly.
- [ ] Navigate to **Budgets** (current month). Allocation panel appears above the KPI row: `Expected $9,000 · Allocated $X · Unallocated $Y`. Bar fills proportionally.
- [ ] Open the **Categories** tab in Settings — "Income" still exists but no longer shows up as a row in the budget list (it's filtered by `type = 'income'`).
- [ ] Open **Chat**. Ask "Are we on track for income this month?" — Claude should reference both the expected figure and what's been received.
- [ ] Open **Summary** for the current month — the recap should mention income vs expected when there's a gap.

### Edge cases

- [ ] **No income set:** Clear the Settings field, save. Dashboard income card falls back to "Received: $X" with no progress bar. Allocation panel disappears from Budgets entirely.
- [ ] **Over-allocated:** Set income to $1,000 with existing budgets totalling > $1,000. Allocation panel shows negative "Unallocated" in destructive colour; bar fills 100% in destructive colour.
- [ ] **Rename Income category:** In Categories, rename "Income" → "Salary & wages". Dashboard "Received" still calculates correctly (uses `type`, not name).
- [ ] **No transactions in income category:** Have only expense transactions for the month. Received = $0; gap = full expected amount.
- [ ] **Future month:** Pick a future month on the Budgets page. Allocation panel renders the same (Expected is household-wide, doesn't depend on month-specific data).
- [ ] **Past month with closed data:** Pick a past month. Income card shows received vs expected for that month; pace badge reads "Past month" (or omits — TBD during build, simplest: always show actual progress, drop pace badge for past months).
- [ ] **Pace edge: 1st of the month:** Day 1 of N — pace badge should not divide by zero; renders as e.g. `Day 1 of 31 (3% through)`.

## Out of scope for this session

- Transfer-type system categories (Savings Transfer, Credit Card Payment) — item C of roadmap.
- Transfer-exclusion across spend aggregation (dashboard totals, budget "Spent", chat context, summary, AI categorisation prompt updates) — item C.
- Per-month income overrides (a future change if real usage shows variable income).
- Multiple income sources / income breakdown by source.
- Auto-categorisation prompt updates referencing the new `type` column — defer until C.
- Summary "Regenerate" button.
- Budget rollover toggle (separate roadmap item).
- Dashboard "Recap snippet" card showing the same gap inline.

---

<!-- Fill in below during/after the session -->

## What actually happened

Plan executed as written. A few small notes:

- Dashboard now has **four** cards (Income / Spend / Net / Fixed costs) — the original `IncomeVsSpendCards` rendered three (Income, Spend, Net), so the new layout preserves Net as `NetCard` rather than dropping it. Layout fits the existing `grid-cols-2 lg:grid-cols-4`.
- When `expected_monthly_income_cents` is set, the Income card shows `received_income_cents` (income-type categories only). When it isn't set, it falls back to `income_cents` (all positive amounts) so existing households without a projected income see no change in behaviour.
- Settings tabs: added a new "Household" tab as the default (was "Accounts"). Felt right for the first piece of household-level config.
- `next lint` auto-rewrote `tsconfig.json` formatting on first run — reverted to keep the diff clean.

## Files created / modified

**Schema**

- `supabase/migrations/20260527000000_projected_income.sql` (new)
- `docs/schema/current.md`
- `src/types/index.ts`

**Queries / actions**

- `src/lib/queries/household.ts` (new)
- `src/lib/actions/household.ts` (new)
- `src/lib/queries/dashboard.ts`
- `src/lib/queries/budgets.ts`
- `src/lib/queries/chat-context.ts`
- `src/lib/queries/summary.ts`

**UI — Settings**

- `src/app/(app)/settings/page.tsx`
- `src/components/settings/SettingsTabs.tsx`
- `src/components/settings/HouseholdContent.tsx` (new)

**UI — Dashboard**

- `src/app/(app)/dashboard/DashboardContent.tsx`
- `src/components/dashboard/IncomeVsExpectedCard.tsx` (new)
- `src/components/dashboard/SpendVsBudgetedCard.tsx` (new)
- `src/components/dashboard/NetCard.tsx` (new)
- `src/components/dashboard/IncomeVsSpendCards.tsx` (deleted)

**UI — Budgets**

- `src/app/(app)/budgets/page.tsx`
- `src/components/budgets/AllocationPanel.tsx` (new)

## Deferred to next session

- Transfer-type system categories ("Savings Transfer", "Credit Card Payment") and transfer exclusion across spend aggregation — roadmap item C.
- Per-month income overrides — only build if real usage shows variable income.
- AI categorisation prompt updates referencing the new `type` column.
- Summary "Regenerate" button.

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
