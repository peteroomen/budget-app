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

## Status

- [ ] In progress
- [ ] Complete
- [ ] Partial — see deferred
