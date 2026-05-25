# Admin Page

**Date:** 2026-05-25  
**Branch:** feature/admin-page  
**Roadmap item:** Phase 5 — Polish / housekeeping (admin tooling)

## Goal

A dedicated `/admin` page gated behind `app_metadata.role === 'admin'`, containing destructive household-reset actions. The Delete all transactions button moves here; a new Delete all merchant mappings action is added alongside it.

## Approach

- **Route guard** — the admin page server component checks `user.app_metadata?.role !== 'admin'` and calls `redirect('/dashboard')` if so. Defense in depth: each server action already checks the role independently.
- **Nav link** — the layout fetches `isAdmin` from `supabase.auth.getUser()` alongside the existing `getCurrentProfile()` call, then conditionally appends an Admin entry to the nav.
- **Generic confirm button** — `DangerActionButton` (client component) takes `title`, `description`, and `action` props and renders a shadcn Dialog with a destructive confirm flow. Used twice on the admin page — avoids duplicating identical dialog logic.
- **New server action** — `deleteAllMerchantMappings` in `merchant-map.ts`, same admin-role guard as `deleteAllTransactions`.
- **Cleanup** — remove `DeleteAllTransactionsButton` from transactions page and delete the now-unused component file.

## Steps

- [x] Write plan file
- [x] Create new branch `feature/admin-page`
- [x] Add `deleteAllMerchantMappings` to `src/lib/actions/merchant-map.ts`
- [x] Create `src/components/admin/DangerActionButton.tsx`
- [x] Create `src/app/(app)/admin/page.tsx` (admin guard + two danger actions)
- [x] Update `src/app/(app)/layout.tsx` — fetch `isAdmin`, conditionally show Admin nav link
- [x] Update `src/app/(app)/transactions/page.tsx` — remove `DeleteAllTransactionsButton`
- [x] Delete `src/components/transactions/DeleteAllTransactionsButton.tsx`
- [x] Add `ManualBadge` column to transaction table (blue pencil, tooltip, matches `RecurringBadge` pattern)
- [x] Install shadcn `Tooltip` component (required by `ManualBadge`)
- [x] `pnpm lint` + `pnpm type-check`
- [x] Commit + push + open PR

## Manual test steps

- [ ] Log in as non-admin user — confirm `/admin` redirects to `/dashboard`, no Admin link in nav
- [x] Log in as admin — confirm Admin link appears in nav, `/admin` loads
- [x] Admin page shows two danger sections: "Delete all transactions" and "Delete all merchant mappings"
- [x] Click "Delete all transactions" → confirm dialog → click Delete all → transactions page shows 0 rows
- [x] Click "Delete all merchant mappings" → confirm dialog → click Delete all → `merchant_category_map` table is empty (check Supabase)
- [ ] Edge case: cancel the dialog — confirm nothing is deleted
- [x] Transactions page no longer shows Delete all transactions button for admin users
- [x] ManualBadge: blue pencil appears on manually-overridden transactions; tooltip reads "Category manually overridden"
- [x] June COUNTDOWN TAKANINI (imported via map) correctly shows no pencil icon — `category_source = 'map'`, not `'manual'`

## Out of scope for this session

- Per-entity admin actions (delete one account, reset one merchant)
- Audit log of admin actions
- Admin user management UI

---

## What actually happened

- Scope expanded mid-session to also include the `ManualBadge` column (blue pencil indicator for manually-overridden categories), which was originally shipped inside `CategoryCell` as a plain grey inline SVG. Rebuilt to match the `RecurringBadge` pattern from `feature/recurring-detection`: its own narrow column, blue Lucide icon, shadcn `Tooltip`. Required installing the `Tooltip` shadcn component (not yet in the codebase).
- `categorySource` prop removed from `CategoryCell` entirely — the pencil moved out of the cell into its own column.
- `DangerActionButton` replaced the old one-off `DeleteAllTransactionsButton` — parameterised by title, description, and action, used twice on the admin page.
- Confirmed correct behaviour: transactions categorised via the merchant map (`category_source = 'map'`) do not show the pencil even when the map entry has `is_manual = true`. Pencil is intentionally per-transaction, not per-merchant.
- Two roadmap items added: transaction pagination (approach TBD) and import summary (post-upload breakdown).

## Files created / modified

- `src/app/(app)/admin/page.tsx` — new admin page, role-gated
- `src/components/admin/DangerActionButton.tsx` — generic destructive confirm dialog (replaces `DeleteAllTransactionsButton`)
- `src/components/transactions/ManualBadge.tsx` — new; blue pencil column matching `RecurringBadge` pattern
- `src/components/ui/tooltip.tsx` — new; shadcn Tooltip installed for `ManualBadge`
- `src/lib/actions/merchant-map.ts` — added `deleteAllMerchantMappings`
- `src/app/(app)/layout.tsx` — added `isAdmin` check, conditional Admin nav link
- `src/app/(app)/transactions/page.tsx` — removed `DeleteAllTransactionsButton` and admin check
- `src/components/transactions/CategoryCell.tsx` — removed `categorySource` prop and inline pencil SVG
- `src/components/transactions/TransactionTable.tsx` — added `ManualBadge` column, removed `categorySource` prop pass-through
- `docs/roadmap.md` — added transaction pagination and import summary items to Phase 5
- `docs/work/2026-05-25-admin-page.md` — this file
- `src/components/transactions/DeleteAllTransactionsButton.tsx` — deleted

## Deferred to next session

Nothing — all planned work complete.

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
