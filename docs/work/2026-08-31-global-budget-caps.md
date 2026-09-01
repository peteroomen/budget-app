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
with `effective_from <= M`): preserves history _and_ carries forward, but PostgREST has no
`DISTINCT ON`, so every read fetches all rows and resolves in JS, and "editing a past month
rewrites all later months" needs explaining in the UI. Not worth the complexity for a two-person
tool whose summaries regenerate live anyway.

**Insurance against the irreversible bit:** the migration snapshots the current table to
`budgets_monthly_archive` before collapsing. Nothing reads it; it exists so effective-dating
remains available later without data loss.

**Collapse rule:** take **June 2026's caps as the canonical global set**, falling back to the
row with the greatest `updated_at` for any category June doesn't cover.

The obvious rule — keep the greatest `month` — is **wrong for this data**. Production state as
of 2026-08-31:

| Month   | Categories with caps | Total budget | Rows first written |
| ------- | -------------------- | ------------ | ------------------ |
| 2026-05 | 16                   | $11,353      | 2026-05-24         |
| 2026-06 | 16                   | $11,656      | 2026-05-25         |
| 2026-07 | 6                    | $1,504       | 2026-05-25         |
| 2026-08 | 6                    | $2,302       | 2026-05-25         |

July and August were written on 2026-05-25 — a handful of caps set while browsing ahead. Because
those months then held _some_ rows, the all-or-nothing seed guard never fired for them again and
they froze at 6 stale categories. Greatest-`month` would therefore pick those stale rows over the
real June ones. Greatest-`updated_at` is also unsafe alone: an August row was touched 2026-08-31.

**Unverified:** whether any category has a cap in May/July/August but _not_ in June. Confirm with
a per-category breakdown before running the migration, and keep the `updated_at` fallback so such
a category isn't silently dropped.

**Deliberate scope addition:** with global caps there is no longer any way to unset a cap (you
used to just not set one next month). Adding a "Remove budget" action to the edit dialog keeps
that capability. Called out here so it can be struck if unwanted.

## Steps

- [ ] **1. Migration** — `supabase/migrations/20260831000000_global_budget_caps.sql`
  - `create table public.budgets_monthly_archive as select * from public.budgets;`
    enable RLS + a household-scoped select policy on it
  - Collapse per the rule above — June 2026 wins where present, else greatest `updated_at`:
    ```sql
    delete from public.budgets b using public.budgets b2
     where b.household_id = b2.household_id
       and b.category_id  = b2.category_id
       and (b2.month = '2026-06', b2.updated_at) > (b.month = '2026-06', b.updated_at);
    ```
    (row-comparison orders June-first, then most-recently-touched)
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
  - `src/lib/queries/budgets.ts:71` — keep the `month` param (still scopes _actuals_), drop the
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
      month now compares against the _current_ cap. Adjust the prompt line so Claude describes it as
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
- [ ] Jump back six months → Groceries still $800; spend figures/progress bars reflect _that_
      month's transactions, not the current month's
- [ ] Edit Groceries to $900 while viewing a past month → navigate to the current month and a
      future month; both show $900

**The original bug (must no longer reproduce):**

- [ ] Pick a month with no budgets; set exactly one category's cap, reload → every _other_
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

- [ ] Migration collapse: before migrating, set _different_ caps for the same category in two
      months; after migrating, the later month's value is the one kept
- [ ] `select count(*) from budgets_monthly_archive` matches the pre-migration `budgets` count
- [ ] A second household's caps are unaffected (RLS holds on both `budgets` and the archive)
- [ ] Category with no cap at all → "No budget set", no NaN/Infinity in the percentage badge
- [ ] Delete a category that has a cap → budget row cascade-deletes, Budgets page still renders

## Out of scope for this session

- Effective-dated caps (option B) — archive table keeps the door open
- Per-month cap _overrides_ on top of a global cap (e.g. "December only, $1200")
- Rollover of unspent budget between months (roadmap Phase 3b — being removed as an item)
- Backfilling budget figures into any historical view beyond what the global cap now provides
- In-app budget alerts (separate roadmap item)

---

<!-- Fill in below during/after the session -->

## What actually happened

**Data patch first (applied to production before the code change).** At the user's request,
June's 16 caps were copied into July and August so the app read correctly immediately. A
snapshot was taken to `backup.budgets_20260831` (44 rows) beforehand — deliberately in a
non-exposed schema rather than `public`, so it is not reachable with the anon key.

Reading the live data first changed the migration. The per-category breakdown showed:

- All 16 expense categories have a June cap, and **no** category has a cap outside June — so
  the `updated_at` fallback for orphaned categories turned out to be unnecessary (kept anyway
  as the general collapse rule).
- July held junk values: Dining & Takeaways and Pharmacy at **$1**, Fuel at $400 against June's
  $300.
- Two August rows were touched on 2026-08-31 (Dining, Pharmacy) — both already matched June, so
  the patch was a no-op for them and no deliberate edit was overwritten.
- Loan Repayments carries a $2 cap in June. Obviously a placeholder, but carried forward
  faithfully rather than inventing a number — flagged to the user instead.

After the patch all four months hold identical rows, which makes the migration's collapse
unambiguous whichever rule is used.

**Collapse rule changed** from "greatest `month`" to "greatest `(updated_at, month)`". The
original rule would have enshrined the stale July/August rows over the real June caps — caught
only by looking at the production data before running it.

**Archive location changed** from `public.budgets_monthly_archive` (with RLS) to
`archive.budgets_monthly`. A table in `public` is exposed through PostgREST and would be
readable with the anon key if the RLS policy were ever wrong; a non-exposed schema removes that
class of mistake entirely.

**Extra deletion:** `BudgetProgressBar.tsx` was orphaned by removing `BudgetTable.tsx` and
`BudgetCard.tsx` (its only two consumers), so it went too.

**Environment note:** this repo's `CLAUDE.md` says to run `source ~/.nvm/nvm.sh && nvm use 22`
before pnpm scripts. There is no nvm in the Claude Code remote container — Node 22 is already
on PATH at `/opt/node22/bin`. The nvm line is a local-machine instruction, not a universal one.

`next lint` rewrites `tsconfig.json` as a side effect (reformats it and adds
`src/.next/types/**/*.ts` to `include`). Reverted to keep the diff clean.

## Files created / modified

- `supabase/migrations/20260831000000_global_budget_caps.sql` — NEW
- `docs/decisions/003-global-budget-caps.md` — NEW
- `src/types/index.ts` — `month` removed from `Budget`
- `src/lib/actions/budgets.ts` — `upsertBudget` de-monthed; new `deleteBudget`; both now also
  revalidate `/dashboard`
- `src/lib/queries/budgets.ts` — dropped `findMostRecentBudgetMonth` + `seedBudgetsFromMonth`;
  budgets select no longer filtered by month
- `src/lib/queries/dashboard.ts` · `summary.ts` · `chat-context.ts` — month filter removed
- `src/lib/queries/summary.ts` + `chat-context.ts` — prompt wording: caps described as standing
  values, so retrospective months aren't narrated as "what you budgeted at the time"
- `src/app/(app)/budgets/page.tsx` — seed block + banner removed; subtitle now
  "N categories · standing caps · spend for {month}"
- `src/components/budgets/SetBudgetDialog.tsx` — `month` prop gone; "Monthly cap" + helper text;
  "Remove budget" button
- `src/components/budgets/BudgetList.tsx` — stops passing `month` to the dialog
- `docs/schema/current.md`, `docs/roadmap.md` (Rollover toggle dropped), `CLAUDE.md`
- DELETED: `SeededFromBanner.tsx`, `BudgetTable.tsx`, `BudgetCard.tsx`, `BudgetProgressBar.tsx`

## Verified

- `pnpm type-check` — clean
- `pnpm lint` — clean
- `pnpm run build` — succeeds, all 18 routes compile

## Deferred to next session

- **The migration has NOT been applied to production.** It must run _with_ the deploy, not
  before: the live app still queries `.eq('month', month)`, so dropping the column ahead of the
  deploy breaks the budgets page, dashboard, summary and chat.
- `backup.budgets_20260831` is a one-off safety net from the data patch and is now redundant
  with `archive.budgets_monthly` once the migration runs. Drop it once the deploy is confirmed
  healthy.
- Loan Repayments has a $2 placeholder cap — needs a real number.
- Manual test steps below are unrun; they need a deployed environment.

## Status

- [ ] In progress
- [ ] Complete
- [x] Partial — code complete and verified locally; migration not yet applied to production
