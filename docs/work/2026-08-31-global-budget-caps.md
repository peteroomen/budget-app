# Global Budget Caps (remove per-month budgets)

**Date:** 2026-08-31
**Branch:** claude/budget-caps-global-monthly-bli79e
**Roadmap item:** Phase 5 — Polish (budget UX fix, not previously roadmapped)

## Goal

A budget cap is set once per category and applies to every month, instead of being stored
per-month and needing to be re-seeded or re-entered. Spend, progress bars and KPIs stay
month-scoped — only the cap becomes global.

## Problem being fixed

`budgets` is keyed `(household_id, category_id, month)`. Carry-forward is faked by an auto-seed
that runs as a side effect of rendering `budgets/page.tsx`:

- **All-or-nothing** — seeds only when the month has zero budget rows, so setting one cap first
  in a new month permanently blocks the seed for the other ~15 categories.
- **Visit-triggered** — months where the Budgets page was never opened have no rows, so the
  dashboard, summary and chat context (all hard `.eq('month', month)`) report "no budget set".
- **Edits don't propagate** — changing a cap in June leaves an already-seeded July untouched.

There is no persisted summaries table (recaps regenerate live on each visit), so the `month`
column's only real value is retaining the raw cap figure for a past month.

## Approach

**Chosen: fully global caps.** Drop `month` from `budgets`; unique on `(household_id, category_id)`.

Rejected alternative — **effective-dated caps** (`month` → `effective_from`, lookup = latest row
with `effective_from <= M`): preserves history *and* carries forward, but PostgREST has no
`DISTINCT ON`, so every read fetches all rows and resolves in JS, and "editing a past month
rewrites all later months" needs explaining in the UI. Not worth the complexity for a two-person
tool whose summaries regenerate live anyway.

**Insurance against the irreversible bit:** the migration snapshots the current table to
`budgets_monthly_archive` before collapsing. Nothing reads it; it exists so effective-dating
remains available later without data loss.

**Collapse rule:** keep the row with the greatest `month` per `(household_id, category_id)` —
the most recently expressed intent. Because the existing seed copies caps forward, most
categories already have identical values across months, so this is a no-op for them.

**Deliberate scope addition:** with global caps there is no longer any way to unset a cap (you
used to just not set one next month). Adding a "Remove budget" action to the edit dialog keeps
that capability. Called out here so it can be struck if unwanted.

## Steps

- [ ] **1. Migration** — `supabase/migrations/20260831000000_global_budget_caps.sql`
  - `create table public.budgets_monthly_archive as select * from public.budgets;`
    enable RLS + a household-scoped select policy on it
  - Collapse: `delete from budgets b using budgets b2 where b.household_id = b2.household_id
    and b.category_id = b2.category_id and b.month < b2.month;`
  - `alter table public.budgets drop constraint budgets_household_id_category_id_month_key;`
  - `alter table public.budgets drop column month;`
  - `alter table public.budgets add constraint budgets_household_id_category_id_key
    unique (household_id, category_id);`
  - `drop index idx_budgets_household_month;` → `create index idx_budgets_household on
    public.budgets(household_id);`
  - Verify post-migration row count == distinct `(household_id, category_id)` pairs

- [ ] **2. Type** — `src/types/index.ts`: remove `month` from `interface Budget`

- [ ] **3. Server action** — `src/lib/actions/budgets.ts`
  - `upsertBudget`: drop the `month` form field + its validation; `onConflict:
    'household_id,category_id'`
  - Add `deleteBudget(categoryId)` — deletes the row for the household + category,
    `revalidatePath('/budgets')`

- [ ] **4. Queries** — remove the four `.eq('month', month)` filters on `budgets`
  - `src/lib/queries/budgets.ts:71` — keep the `month` param (still scopes *actuals*), drop the
    filter on the budgets select; **delete** `findMostRecentBudgetMonth` and `seedBudgetsFromMonth`
  - `src/lib/queries/dashboard.ts:74`
  - `src/lib/queries/summary.ts:92`
  - `src/lib/queries/chat-context.ts:98`

- [ ] **5. Budgets page** — `src/app/(app)/budgets/page.tsx`
  - Delete the seed block (lines ~53-61) and the `seededFrom` state — this also removes a write
    performed during a server-component render
  - Drop the `SeededFromBanner` import + render
  - Subheading: make clear caps are standing while spend is month-scoped, e.g.
    `{n} categories · standing caps · spend for {monthLabel}`

- [ ] **6. Dialog** — `src/components/budgets/SetBudgetDialog.tsx`
  - Remove the `month` prop and the `<input type="hidden" name="month">`
  - Label → "Monthly cap (NZD)", helper text "Applies to every month."
  - Add a "Remove budget" destructive-ghost button (only when `existing !== null`) wired to
    `deleteBudget`

- [ ] **7. BudgetList** — `src/components/budgets/BudgetList.tsx`: stop passing `month` to
  `SetBudgetDialog`; keep the `month` prop itself (still used by the drill-down href)

- [ ] **8. Delete dead files**
  - `src/components/budgets/SeededFromBanner.tsx` (no longer used)
  - `src/components/budgets/BudgetTable.tsx` + `src/components/budgets/BudgetCard.tsx` — already
    unreferenced before this change; both take a `month` prop and would otherwise need updating
    for a `Budget` type that no longer has one

- [ ] **9. Summary prompt wording** — `src/lib/queries/summary.ts` (~line 300): a retrospective
  month now compares against the *current* cap. Adjust the prompt line so Claude describes it as
  the standing cap rather than "the budget set for {month}".

- [ ] **10. Docs**
  - `docs/schema/current.md` — budgets table (drop `month`, new unique constraint) + new
    `budgets_monthly_archive`
  - `docs/roadmap.md` — line 143 wording; line 146 "Rollover toggle (Phase 3b)" is now
    incoherent (nothing to roll over between months) — remove or restate
  - `docs/decisions/003-global-budget-caps.md` — ADR recording A-vs-B and the archive table
  - `CLAUDE.md` — Current State section (also stale: still says last session 2026-05-30, missing
    the 2026-06-02 PR #36 work)

- [ ] **11. `pnpm lint` + `pnpm type-check`** (`source ~/.nvm/nvm.sh && nvm use 22` first)

- [ ] **12. Commit + push**

## Manual test steps

**Happy path — carry-forward:**

- [ ] Budgets page, current month: set Groceries to $800; confirm the row shows $800
- [ ] Jump forward two months via the global month picker → Groceries still $800, no seed banner
- [ ] Jump back six months → Groceries still $800; spend figures/progress bars reflect *that*
      month's transactions, not the current month's
- [ ] Edit Groceries to $900 while viewing a past month → navigate to the current month and a
      future month; both show $900

**The original bug (must no longer reproduce):**

- [ ] Pick a month with no budgets; set exactly one category's cap, reload → every *other*
      category still shows its standing cap (previously all would show "No budget set")

**Cross-page consistency:**

- [ ] Dashboard for a month never visited on the Budgets page → "Spend vs budgeted" card shows a
      non-zero budgeted total
- [ ] Summary for that same month → budget comparisons present, not "no budget set"
- [ ] Chat: "how am I tracking against budget?" for that month → Claude cites caps

**Remove budget:**

- [ ] Open a category with a cap → "Remove budget" → row reverts to "No budget set" in every month
- [ ] Total budget KPI and the AllocationPanel unallocated figure both drop accordingly

**Edge cases:**

- [ ] Migration collapse: before migrating, set *different* caps for the same category in two
      months; after migrating, the later month's value is the one kept
- [ ] `select count(*) from budgets_monthly_archive` matches the pre-migration `budgets` count
- [ ] A second household's caps are unaffected (RLS holds on both `budgets` and the archive)
- [ ] Category with no cap at all → "No budget set", no NaN/Infinity in the percentage badge
- [ ] Delete a category that has a cap → budget row cascade-deletes, Budgets page still renders

## Out of scope for this session

- Effective-dated caps (option B) — archive table keeps the door open
- Per-month cap *overrides* on top of a global cap (e.g. "December only, $1200")
- Rollover of unspent budget between months (roadmap Phase 3b — being removed as an item)
- Backfilling budget figures into any historical view beyond what the global cap now provides
- In-app budget alerts (separate roadmap item)

---

<!-- Fill in below during/after the session -->

## What actually happened

## Files created / modified

## Deferred to next session

## Status

- [ ] In progress
- [ ] Complete
- [ ] Partial — see deferred
