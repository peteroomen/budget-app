# Transaction List UI

**Date:** 2026-05-24  
**Branch:** feature/transaction-list  
**Roadmap item:** Phase 1 — Transaction list view (build order item #6)

## Goal

A user can view all imported transactions in a sortable, filterable table at `/transactions` — sort by date/amount/merchant, filter by account and date range. Category shown if set, "Uncategorised" if not.

## Approach

URL search params drive all filter/sort state (bookmarkable, no client state needed for data).  
Server-side Supabase query joins transactions → accounts → categories.  
Amount displayed as NZD (cents ÷ 100), negative amounts in red.

- **`TransactionFilters`** — client component; controls shadcn `Select` (account) + `Input` (date range); uses `useRouter` + `useSearchParams` to push URL updates
- **`TransactionTable`** — server component; sortable column headers are `<Link>` elements that toggle sort param in URL
- **`getTransactions(filters)`** — server query in `src/lib/queries/transactions.ts`
- shadcn `table` component added via `pnpm dlx shadcn@latest add table`

No pagination for Phase 1 — household transaction volume is small enough.

## Steps

- [x] Write plan file
- [ ] Install shadcn `table` component
- [ ] `src/lib/queries/transactions.ts` — `getTransactions()` with join to accounts + categories, accepts filter/sort params
- [ ] `src/components/transactions/TransactionFilters.tsx` — client component: account select + date-from/date-to inputs
- [ ] `src/components/transactions/TransactionTable.tsx` — server component: shadcn Table with sortable `<Link>` headers, amount formatting, "Uncategorised" fallback
- [ ] `src/app/(app)/transactions/page.tsx` — replace stub: reads searchParams, fetches accounts + transactions, renders filters + table + empty state
- [ ] `pnpm lint` + `pnpm type-check`
- [ ] Commit + push + open PR

## Manual test steps

- [ ] Navigate to `/transactions` — confirm page loads with heading and empty state message when no transactions exist
- [ ] After importing the ANZ sample CSV: confirm transactions appear in the table (date, merchant, description, amount, account name, "Uncategorised")
- [ ] Click the "Date" column header — confirm rows re-sort ascending; click again → descending
- [ ] Click "Amount" header — confirm sort by amount_cents
- [ ] Filter by a specific account — confirm only that account's transactions appear
- [ ] Set a date range — confirm only transactions within that range appear
- [ ] Combine account filter + date range — confirm both apply together
- [ ] Clear filters (no account selected, no dates) — confirm all transactions return
- [ ] Edge case: negative amounts show in red; positive amounts (income) show in default colour

## Out of scope for this session

- PDF import pipeline (item #5)
- Category system (item #7) — "Uncategorised" is the placeholder
- Inline category override
- Pagination
- Full-text search (Phase 5)
- CSV export (Phase 5)

---

## What actually happened

- shadcn `table` added (`pnpm dlx shadcn@latest add table`) — installs `src/components/ui/table.tsx`
- Amount formatter uses `Intl.NumberFormat` for NZD, sign derived from amount_cents sign
- Sort link helper builds new URLSearchParams toggling direction when same column re-clicked
- TransactionFilters uses debounce-free approach: Select triggers immediate router.push; date inputs use form onChange + router.push
- Supabase join via `account:accounts(name, institution), category:categories(name)` — RLS scopes to household through accounts
- TypeScript required explicit return type annotations on the joined query result — used a local `TransactionRow` type
- lint and type-check pass clean

## Files created / modified

- `src/components/ui/table.tsx` — added (shadcn)
- `src/lib/queries/transactions.ts` — new: `getTransactions()` query
- `src/components/transactions/TransactionFilters.tsx` — new: client filter controls
- `src/components/transactions/TransactionTable.tsx` — new: shadcn Table with sort + formatting
- `src/app/(app)/transactions/page.tsx` — replaced stub with full server page

## Deferred to next session

- PDF import pipeline (item #5)
- Category system (item #7)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
