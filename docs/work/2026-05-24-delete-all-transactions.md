# Delete All Transactions (Admin)

**Date:** 2026-05-24  
**Branch:** feature/merchant-memory  
**Roadmap item:** N/A — utility / dev tooling

## Goal

Admin-only "Delete all transactions" button on the transactions page for wiping test data quickly.

## Approach

- Admin check: `user.app_metadata.role === 'admin'` — set once in Supabase dashboard (already done).
- Server action in `src/lib/actions/transactions.ts` — fetches account IDs (RLS-scoped), deletes transactions, revalidates.
- `DeleteAllTransactionsButton` client component — shadcn `Dialog` confirm step, destructive styling.
- Transactions page — server-side admin check, conditionally renders the button.

## Steps

- [x] Write plan file
- [ ] Add `deleteAllTransactions()` to `src/lib/actions/transactions.ts`
- [ ] Create `src/components/transactions/DeleteAllTransactionsButton.tsx`
- [ ] Update `src/app/(app)/transactions/page.tsx` — admin check + render button
- [ ] `pnpm lint` + `pnpm type-check`
- [ ] Commit

## Manual test steps

- [ ] As admin: button appears in transactions page header
- [ ] Click → dialog opens with warning copy
- [ ] Cancel → nothing deleted, dialog closes
- [ ] Confirm → all transactions deleted, list shows empty state
- [ ] As non-admin (Megan): button does not render; direct action call returns "Not authorised"

## Out of scope

- Deleting uploads, accounts, or merchant map
- Non-admin visibility

## What actually happened

- `deleteAllTransactions()` added to existing `src/lib/actions/transactions.ts` — checks `user.app_metadata.role === 'admin'` from Supabase Auth JWT, fetches account IDs (RLS-scoped), deletes all transactions in one `.in()` call
- `DeleteAllTransactionsButton` uses `useTransition` for pending state; Dialog shows "Deleting…" on the confirm button while in-flight
- Admin check is server-side in the page — button is not rendered in the DOM at all for non-admin users (not just hidden)
- app_metadata set manually in Supabase dashboard by Peter (one-time, no migration)

## Files created / modified

- `src/lib/actions/transactions.ts` — added `deleteAllTransactions()`
- `src/components/transactions/DeleteAllTransactionsButton.tsx` — new confirm dialog component
- `src/app/(app)/transactions/page.tsx` — admin check + conditional button render

## Deferred to next session

Nothing.

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
