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
- [ ] Create new branch `feature/admin-page`
- [ ] Add `deleteAllMerchantMappings` to `src/lib/actions/merchant-map.ts`
- [ ] Create `src/components/admin/DangerActionButton.tsx`
- [ ] Create `src/app/(app)/admin/page.tsx` (admin guard + two danger actions)
- [ ] Update `src/app/(app)/layout.tsx` — fetch `isAdmin`, conditionally show Admin nav link
- [ ] Update `src/app/(app)/transactions/page.tsx` — remove `DeleteAllTransactionsButton`
- [ ] Delete `src/components/transactions/DeleteAllTransactionsButton.tsx`
- [ ] `pnpm lint` + `pnpm type-check`
- [ ] Commit + push + open PR

## Manual test steps

- [ ] Log in as non-admin user — confirm `/admin` redirects to `/dashboard`, no Admin link in nav
- [ ] Log in as admin — confirm Admin link appears in nav, `/admin` loads
- [ ] Admin page shows two danger sections: "Delete all transactions" and "Delete all merchant mappings"
- [ ] Click "Delete all transactions" → confirm dialog → click Delete all → transactions page shows 0 rows
- [ ] Click "Delete all merchant mappings" → confirm dialog → click Delete all → `merchant_category_map` table is empty (check Supabase)
- [ ] Edge case: cancel the dialog — confirm nothing is deleted
- [ ] Transactions page no longer shows Delete all transactions button for admin users

## Out of scope for this session

- Per-entity admin actions (delete one account, reset one merchant)
- Audit log of admin actions
- Admin user management UI

---

## What actually happened

## Files created / modified

## Deferred to next session

## Status

- [ ] In progress
- [ ] Complete
- [ ] Partial — see deferred
