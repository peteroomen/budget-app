# Transactions Page Polish

**Date:** 2026-05-26  
**Branch:** feature/transactions-polish  
**Roadmap item:** Phase 5 — Polish

## Goal

Bring the transactions page to the design in the screenshot: month-scoped view with a top-right month picker, inline recurring/manual chips below merchant names, relative date formatting, and an "X of Y · Month YYYY" subheading.

## Approach

Five focused changes, no DB migrations, no new files, no new deps.

1. `getTransactions` — add `month` filter param
2. `MonthPicker` — add `basePath` prop so it's reusable
3. Transactions page — month param, two queries (total/filtered), updated subheading, MonthPicker in header, remove From/To from URL state
4. `TransactionFilters` — remove From/To date pickers
5. `TransactionTable` + badge components — relative date formatting, collapse icon columns into inline merchant-cell chips

## Steps

- [ ] `src/lib/queries/transactions.ts` — add `month?: string` to `TransactionFilters`; when set apply `gte(date, YYYY-MM-01)` and `lt(date, YYYY-[M+1]-01)`
- [ ] `src/components/budgets/MonthPicker.tsx` — add `basePath?: string` prop (default `'/budgets'`)
- [ ] `src/app/(app)/transactions/page.tsx` — read `month` (default current month); two queries in parallel; subheading "X of Y · Month YYYY"; add MonthPicker to header; remove `from`/`to` from URL params
- [ ] `src/components/transactions/TransactionFilters.tsx` — remove From and To date pickers and their state; keep Search, Account, Category, Clear
- [ ] `src/components/transactions/RecurringBadge.tsx` — restyle as pill chip (`↻ Recurring`, `bg-primary/10 text-primary`), keep `toggleRecurring` action on click
- [ ] `src/components/transactions/ManualBadge.tsx` — restyle as display-only pill chip (`✎ Manual`, `bg-muted text-muted-foreground`)
- [ ] `src/components/transactions/TransactionTable.tsx` — add `formatRelativeDate()`; remove two icon columns; render chips inline in merchant cell below merchant name

## Manual test steps

- [ ] Transactions page loads showing current month by default
- [ ] `‹ May 2026 ›` picker appears top right; clicking `‹` moves to April, `›` to June
- [ ] Subheading reads "88 of 88 · May 2026"; with category filter active it reads "12 of 88 · May 2026"
- [ ] Search, account filter, category filter still work and update the filtered count
- [ ] Date cell shows "Today" / "1 day ago" / "5 days ago" for recent; "15 May" for older same-year dates
- [ ] Recurring transactions show a `↻ Recurring` chip below merchant name; clicking it toggles and chip disappears
- [ ] Manually categorised transactions show `✎ Manual` chip below merchant name
- [ ] No orphan icon columns — table has Date | Merchant | Category | Account | Amount only
- [ ] From/To date pickers are gone from filter bar
- [ ] Edge: no transactions in month → shows empty state message

## Out of scope

- Mobile `TransactionDayList` chip updates
- Guard against future-month navigation
- Sort column changes

---

## What actually happened

## Files created / modified

## Deferred to next session

## Status

- [ ] In progress
- [ ] Complete
- [ ] Partial — see deferred
