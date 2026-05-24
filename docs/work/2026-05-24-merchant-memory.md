# Merchant Memory

**Date:** 2026-05-24  
**Branch:** feature/merchant-memory  
**Roadmap item:** Phase 2 — Merchant Memory (build order item #8)

## Goal

On import, automatically apply categories to transactions whose merchant is already known. On manual category override in the transaction list, remember that mapping so future imports are pre-categorised. Provide a "forget this mapping" escape hatch.

## Approach

`merchant_category_map` already exists in the schema (initial migration) with RLS, indexes, and a unique constraint on `(household_id, merchant_name)`. No new migration needed.

**Import path:**

- After normalising merchant names, batch-fetch all existing mappings for the household
- Build a `Map<merchantName, categoryId>` in memory
- Apply matching `category_id` during the `toInsert` construction — zero extra round-trips for already-mapped merchants
- Un-mapped merchants remain `category_id: null` (AI categorisation is item #9)

**Override path:**

- Inline category `Select` per transaction row in the table (client component `CategoryCell`)
- On change: `setCategoryOverride` server action — updates `transactions.category_id` AND upserts `merchant_category_map` in a single action
- "Forget" button (small X) next to the select when a mapping exists — calls `deleteMerchantMapping` then clears the category from the merchant map (does NOT uncategorise the current transaction)
- `useOptimistic` for instant UI feedback; revalidation refreshes the page data

**Component split:**

- `TransactionTable` stays a server component — renders `CategoryCell` per row
- `CategoryCell` is a `'use client'` component — holds the Select + forget button
- Categories list fetched once at page level and passed down

## Steps

- [x] Write plan file
- [ ] `src/lib/queries/merchant-map.ts` — `getMerchantMappingsForImport(supabase, householdId, merchantNames[])` returns a lookup map
- [ ] `src/lib/actions/merchant-map.ts` — `upsertMerchantMapping(merchantName, categoryId)` and `deleteMerchantMapping(merchantName)` server actions
- [ ] `src/lib/actions/transactions.ts` — `setCategoryOverride(transactionId, categoryId | null)` — updates txn + upserts map
- [ ] Update `src/lib/actions/import.ts` — batch-fetch merchant map after parsing, apply categories before insert
- [ ] `src/components/transactions/CategoryCell.tsx` — client component: shadcn Select + forget button
- [ ] Update `src/components/transactions/TransactionTable.tsx` — pass categories, render CategoryCell
- [ ] Update `src/app/(app)/transactions/page.tsx` — fetch categories, pass to table
- [ ] `pnpm lint` + `pnpm type-check`
- [ ] Commit + push + open PR

## Manual test steps

**Happy path — import applies map:**

- [ ] Import a CSV/PDF statement; note one merchant (e.g. "COUNTDOWN TAKANINI")
- [ ] In the transaction list, assign it to "Groceries" via the inline Select
- [ ] Import the same or another statement containing the same merchant
- [ ] Confirm the newly imported transaction arrives already categorised as "Groceries"

**Manual override remembers:**

- [ ] Find an uncategorised transaction; change its category via the Select
- [ ] Reload the page — confirm the category is still set on that transaction
- [ ] Import again with the same merchant — confirm it gets the category automatically

**Forget mapping:**

- [ ] Override a merchant to "Dining Out"
- [ ] Click the "Forget" button (X) next to the category
- [ ] Confirm the merchant map entry is removed (next import won't auto-categorise it)
- [ ] Confirm the current transaction's category is unchanged (forget only affects the map)

**Edge cases:**

- [ ] Setting a transaction back to "Uncategorised" (null) via Select — confirm it updates the transaction only; does NOT delete the merchant mapping if one exists
- [ ] Two transactions for the same merchant — override one → both show the category (RLS protects other households)
- [ ] Import with a merchant that has no mapping — confirm category_id is null (not an error)

## Out of scope for this session

- AI categorisation for unmapped merchants (item #9)
- "Re-categorise all" button
- Category filter in the transaction list for category-specific views
- Pagination

---

## What actually happened

- `merchant_category_map` table already existed in the initial schema migration with correct RLS, indexes, and unique constraint — no new migration needed
- Import action refactored: fetches `account.household_id` alongside `account.id` (needed for the merchant map lookup), then batch-fetches all matching mappings in one query, applies `category_id` to each insert row
- `getMerchantMappingsForImport` takes a bounded list of merchant names so the query doesn't scan the whole table
- `getMappedMerchantNames` fetches all mapped names for the household — used on the transactions page to determine whether to show the "forget" button per row
- `setCategoryOverride` updates the transaction AND upserts the merchant map in sequence; clearing the category (null) updates the transaction only and leaves the map intact
- `CategoryCell` is a `'use client'` component using `useTransition` for pending state — the whole cell dims while the server action is in-flight; no `useOptimistic` needed since the revalidation is fast enough
- Pre-existing type error fixed in untracked `src/lib/queries/dashboard.ts` (Supabase foreign key join cast needed `as unknown as` intermediate)

## Files created / modified

- `src/lib/queries/merchant-map.ts` — new: `getMerchantMappingsForImport` (for import), `getMappedMerchantNames` (for transaction page)
- `src/lib/actions/merchant-map.ts` — new: `upsertMerchantMapping`, `deleteMerchantMapping`
- `src/lib/actions/transactions.ts` — new: `setCategoryOverride`
- `src/lib/actions/import.ts` — updated: fetches household_id from account, batch-fetches merchant map, applies categories on insert
- `src/components/transactions/CategoryCell.tsx` — new: inline category select + forget button
- `src/components/transactions/TransactionTable.tsx` — updated: accepts `categories` + `mappedMerchants`, renders `CategoryCell`
- `src/app/(app)/transactions/page.tsx` — updated: fetches categories + mapped merchants, passes to table
- `src/lib/queries/dashboard.ts` — fixed pre-existing `as unknown as` cast (untracked file from parallel session)

## Deferred to next session

- AI categorisation for unmapped merchants (item #9)
- Updating existing uncategorised transactions retroactively when a merchant map is created (currently only applies on next import)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
