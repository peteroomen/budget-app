# Category cap strip on the transactions screen

**Date:** 2026-09-01
**Branch:** claude/tx-category-cap-strip
**Roadmap item:** Phase 5 — Polish → "Category cap strip on the transactions screen"

## Goal

When `/transactions` is filtered to a single category (`?cat=<uuid>`), show that category's
standing cap and this month's progress against it, just under the filter bar. With no category
filter — or for a category with no cap — the page looks exactly as it does today.

## Approach

Everything needed is already on the page: `month`, `sp.cat`, and `getBudgetsWithActuals(month)`,
which returns `{ category, budget, actual_cents }` per expense category (caps are global now, so
`month` scopes only the actuals).

- Fetch `getBudgetsWithActuals(month)` **only when `sp.cat` is set** — no extra query cost on the
  unfiltered page. It joins the existing `Promise.all`.
- New presentational server component `CategoryCapStrip` — no client hooks needed, so it stays a
  server component and ships no JS.
- **Visual language mirrors `BudgetList`** deliberately, so the two screens agree at a glance:
  same thresholds (ratio >= 1 → `bg-destructive` / `danger` badge, >= 0.8 → `bg-warning` / `warn`,
  else `bg-success` / `outline`), same `Progress` + `indicatorClassName`, same NZD formatter,
  same "X left" / "X over" phrasing.

### Two decisions settled at triage (roadmap) — implemented as written

1. **Full-month spend, not the currently-filtered spend.** The page already computes
   `allMonthTransactions` and `filteredTransactions`; the strip reads `actual_cents` from
   `getBudgetsWithActuals`, which is the whole month for that category. Showing filtered spend
   would mean typing a search term silently changes the number and makes it disagree with the
   Budgets page for the same category. The strip is labelled with the month so it reads as the
   month's total, not "what's on screen".
2. **Render nothing when there is no cap, and nothing for income/transfer categories.**
   `getBudgetsWithActuals` filters to `type = 'expense'`, so a non-expense category simply has no
   entry in the result — treated as "no strip" rather than a zero state. A matched category with
   `budget === null` also renders nothing. Percentage guards against divide-by-zero via the same
   `budgetCents > 0` check `BudgetList` uses.

## Steps

- [ ] Add `CategoryCapStrip` at `src/components/transactions/CategoryCapStrip.tsx`
- [ ] Conditionally fetch `getBudgetsWithActuals(month)` in `transactions/page.tsx` when `sp.cat` set
- [ ] Look up the matching item; render the strip below `TransactionFilters` when it has a budget
- [ ] `pnpm lint`, `pnpm type-check`, `pnpm run build`
- [ ] Update CLAUDE.md Current State + tick the roadmap item

## Manual test steps

- [ ] Happy path: Budgets → click a category's drill-down arrow → `/transactions?cat=…&month=…`
      shows the strip with the category name, `$X of $Y`, a progress bar and a % badge. The
      figures match that category's row on the Budgets page for the same month.
- [ ] Type a search term that narrows the list — the row count in the subheading changes, the
      strip's spend figure does **not** (it stays the month total).
- [ ] Switch the month in the global picker with `cat` still set — the cap stays the same, the
      spend and % change.
- [ ] Edge: filter to a category with no cap set → no strip, no empty box.
- [ ] Edge: filter to an income or transfer category (e.g. Savings Transfer) → no strip.
- [ ] Edge: clear the category filter → strip disappears.
- [ ] Edge: category over budget → bar is destructive-red, badge is `danger`, "$X over".

## Out of scope for this session

- Any change to `TransactionFilters` (it stays a pure filter bar)
- Any change to the Budgets page or `getBudgetsWithActuals`
- Editing the cap from the transactions screen
- A strip for account or search filters
- Any migration — this is read-only UI

---

<!-- Fill in below during/after the session -->

## What actually happened

Built as planned — no surprises, no scope creep.

- `CategoryCapStrip` needed no client-side state, so it is a plain **server component**: zero JS
  added to the route (the `/transactions` bundle grew only by the strip's markup).
- The strip takes `category` / `budget` / `actualCents` rather than the whole `BudgetWithActual`,
  so the `budget !== null` narrowing happens once in the page and the component never has to
  render a "no cap" branch.
- Kept the strip's label explicit — "All {category} spend in {month} — the filters above don't
  change this figure" — so decision (1) is legible to the reader, not just to the code.
- `getBudgetsWithActuals` is only called when `sp.cat` is set, so the unfiltered page does no
  extra work.

## Files created / modified

- `src/components/transactions/CategoryCapStrip.tsx` — **new**, ~80 lines
- `src/app/(app)/transactions/page.tsx` — conditional `getBudgetsWithActuals(month)` in the
  existing `Promise.all`, `capItem` lookup, render below `TransactionFilters`; hoisted
  `monthLabel` out of the subheading so the strip can reuse it
- `docs/work/2026-09-01-tx-category-cap-strip.md` — this file
- `docs/roadmap.md` — item ticked
- `CLAUDE.md` — Current State

No migration, no schema change, no new dependency, no ADR (both decisions were settled at triage
and are recorded in the roadmap entry).

## Verified

- `pnpm lint` — clean (`tsconfig.json` side-effect reverted before committing)
- `pnpm type-check` — clean
- `pnpm run build` — succeeds, all 21 routes generated
- `prettier --check` — clean

**Not verified:** none of the manual test steps above were run — this container has no Supabase
credentials or seeded data, so the strip has never been rendered against real rows. The visual
result and the "figures match the Budgets page" claim are unconfirmed.

## Deferred to next session

- Run the manual test steps against real data.
- Possible follow-on if it feels lacking in use: make the strip a link back to
  `/budgets?month=…`, or let the cap be edited in place (deliberately left out — the strip is
  read-only for now).

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
