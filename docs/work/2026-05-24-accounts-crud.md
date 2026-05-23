# Accounts CRUD

**Date:** 2026-05-24  
**Branch:** feature/accounts-crud  
**Roadmap item:** Phase 1 — Accounts (build order item #3)

## Goal

Users can add and delete bank accounts from the UI. The `/accounts` page goes from placeholder to functional.

## Approach

Server actions for `createAccount` / `deleteAccount`. Server query `getAccounts()` scoped to household via RLS (no explicit household_id filtering needed — RLS handles it).

UI: account list with an "Add account" button that opens a shadcn Dialog. Modal is cleaner than inline for a 3-field form. No edit — delete and re-add if wrong.

Currency hardcoded to NZD (no dropdown). shadcn components to install: `dialog`, `select` (for account type enum).

## Steps

- [x] Install shadcn components: `dialog`, `select`
- [x] Create `src/lib/actions/accounts.ts` — `createAccount`, `deleteAccount` server actions
- [x] Create `src/lib/queries/accounts.ts` — `getAccounts()` server query
- [x] Create `src/components/accounts/AccountCard.tsx` — single account display + delete button
- [x] Create `src/components/accounts/AddAccountDialog.tsx` — modal form (name, institution, type)
- [x] Update `src/app/(app)/accounts/page.tsx` — wire list + add button
- [x] `pnpm lint` + `pnpm type-check`

## Out of scope for this session

- Edit account
- Account balance tracking
- Statement import (build order items #4–5)
- Mobile UI polish

---

<!-- Fill in below during/after the session -->

## What actually happened

- shadcn CLI requires Node 22 (system node is v10); used `nvm use 22` as per last session pattern.
- `deleteAccount.bind(null, id)` produced a type error: bound function returns `Promise<{error}>` not `Promise<void>`, which `<form action>` doesn't accept. Fixed by defining an inline server action (`'use server'` inside the function) in `AccountCard` — the cleanest server-component approach.
- `AddAccountDialog` uses `useActionState` + a `submitted` ref to close the dialog only on successful submission (not on initial render where state.error is also null). A `formKey` resets the form on close/success.
- shadcn `Select` doesn't wire to native form data automatically — used a controlled `useState` + hidden `<input type="hidden">` pattern.
- `pnpm lint` and `pnpm type-check` both pass clean.

## Files created / modified

- `src/lib/actions/accounts.ts` — `createAccount`, `deleteAccount` server actions
- `src/lib/queries/accounts.ts` — `getAccounts()` server query
- `src/components/accounts/AccountCard.tsx` — account card with inline server action delete
- `src/components/accounts/AddAccountDialog.tsx` — modal form with controlled select + useActionState
- `src/app/(app)/accounts/page.tsx` — async server component wiring list + dialog
- `src/components/ui/dialog.tsx` — shadcn Dialog (installed)
- `src/components/ui/select.tsx` — shadcn Select (installed)

## Deferred to next session

- No confirmation step before delete (acceptable for phase 1)
- Edit account (out of scope by design)
- Supabase local stack testing still requires Docker

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
