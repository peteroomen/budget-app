# Per-row Transaction Delete

**Date:** 2026-05-27
**Branch:** feature/tx-row-delete
**Worktree:** `/Users/peteroomen/personal/budget-app-tx-delete`
**Roadmap item:** Phase 5 — Polish (not formally on the list; small UX gap surfaced while reviewing duplicates)

## Goal

A user can delete a single transaction directly from the transactions screen (desktop table + mobile day list), with a confirmation step and a success/failure toast. No bulk select, no "delete duplicates" smart action — that's deferred.

## Approach

- New server action `deleteTransaction(id)` in `src/lib/actions/transactions.ts`. RLS already restricts transactions to the user's household via account ownership, so the action only needs `auth.getUser()` + the delete; it does **not** need the admin-only gate that `deleteAllTransactions` has. `revalidatePath('/transactions')` on success.
- New client component `DeleteTransactionButton` — trash icon trigger, opens shadcn `Dialog` confirm, calls action via `useTransition`, fires `sonner` toast on success/failure. Reused on desktop and mobile.
  - Use existing shadcn `Dialog` (already installed). `alert-dialog` isn't installed and would be a new dependency — skip per CLAUDE.md.
- **Desktop (`TransactionTable`)**: append a new narrow `w-9` column with the trash trigger. Visible only on row hover (`opacity-0 group-hover:opacity-100`) so the table doesn't get visually noisy.
- **Mobile (`TransactionDayList`)**: add the trash trigger as a small muted icon at the far right of each row, always visible (no hover on touch). Sized to keep tap target ≥36px; sits to the right of the amount.

### Why a Dialog (not direct delete)

Deletion is destructive and not undoable in this app. The two-tap cost is worth it to avoid accidental taps on a hover-revealed icon (desktop) or fat-finger on mobile.

### Out-of-scope alternatives considered

- **AlertDialog**: shadcn `alert-dialog` not installed. Plain `Dialog` is functionally equivalent for this case.
- **Undo toast** (5s tombstone): would require either soft-delete column or a deferred queue. Adds schema or background complexity for a private-tool feature.
- **Dropdown menu per row** (•••): future-friendly but not needed today — single action.

## Steps

- [ ] 1. Add `deleteTransaction(id: string)` server action in `src/lib/actions/transactions.ts`
  - [ ] auth check → `Not authenticated` if no user
  - [ ] `supabase.from('transactions').delete().eq('id', id)` — RLS scopes to household
  - [ ] `revalidatePath('/transactions')` on success
- [ ] 2. New `src/components/transactions/DeleteTransactionButton.tsx` (client component)
  - [ ] Props: `transactionId: string`, `description: string` (for the confirm copy), optional `variant: 'desktop' | 'mobile'` to swap icon size
  - [ ] Renders `Dialog` with trigger = trash icon button. On confirm, calls action inside `useTransition`. Closes on success and fires `toast.success("Transaction deleted")`. On error, keeps Dialog open and fires `toast.error(message)`.
  - [ ] Icon: `Trash2` from lucide-react. `text-muted-foreground hover:text-destructive`.
- [ ] 3. `TransactionTable.tsx`: add a new last `<TableHead>` (empty header, `w-9`) + matching `<TableCell>` with `DeleteTransactionButton`. Wrap the icon in `opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity` so it stays accessible via keyboard.
- [ ] 4. `TransactionDayList.tsx`: expand grid to `'9px 1fr auto auto'` (category dot, merchant+cat, amount, delete). Add `DeleteTransactionButton variant="mobile"` in the new column. Muted icon, no hover requirement.
- [ ] 5. `pnpm lint` + `pnpm type-check` — fix any errors
- [ ] 6. Local smoke test (see manual test steps below)
- [ ] 7. Update CLAUDE.md "Current State" to record this work + close out the plan file

## Manual test steps

Run locally (`source ~/.nvm/nvm.sh && nvm use 22 && pnpm dev`):

### Desktop happy path

- [ ] Navigate to `/transactions`. Hover any row → trash icon fades in at the right edge.
- [ ] Click it → Dialog appears showing the merchant/description and "This cannot be undone."
- [ ] Click "Cancel" → Dialog closes, transaction still present.
- [ ] Click trash again → click "Delete" → Dialog closes, row disappears, sonner toast "Transaction deleted" appears.
- [ ] Subheading count ("X of Y · Month") decrements by one.

### Mobile happy path

- [ ] Resize to 360px. On the day-grouped list, every row shows a small trash icon at the right edge (always visible, muted).
- [ ] Tap → confirm Dialog appears. Confirm → row vanishes, toast appears.

### Edge cases

- [ ] Delete a recurring transaction → confirm Dialog still works, recurring badge disappears with the row.
- [ ] Delete a row whose merchant has a mapping (e.g. KFC) → only the transaction is deleted; the merchant_category_map row is unchanged. Verify by importing the same merchant again and confirming it still auto-categorises.
- [ ] Keyboard nav: Tab to a row's delete button on desktop (icon should become visible via `focus-within`), press Enter → Dialog opens, Tab to Delete, press Enter → row deletes.
- [ ] Network error simulated (kill Supabase / wrong key): toast.error appears, Dialog stays open so the user can retry.
- [ ] Try to delete the same row twice fast (double-click confirm): `useTransition`'s `isPending` should disable the button. Confirm no duplicate calls.

## Out of scope for this session

- Bulk delete (multi-row select)
- "Find duplicates" smart action
- Undo toast / soft delete
- Audit log of deletions
- Editing a transaction (notes, amount) — separate roadmap item
- Mobile swipe-to-delete gesture
- Admin "delete-all" already exists in Settings — untouched

---

<!-- Fill in below during/after the session -->

## What actually happened

Implementation matched the plan exactly. No surprises in the wiring — `Dialog` + `useTransition` + `sonner` was straightforward. One small detour: `pnpm lint` (via `next lint`) auto-reformatted `tsconfig.json` on first run in this fresh worktree. The functional change it tried to add (`src/.next/types/**/*.ts` to `include`) is unrelated to this feature, so I reverted it to keep the PR focused.

Verified: `pnpm type-check` clean, `pnpm lint` clean.

## Files created / modified

- `src/lib/actions/transactions.ts` — added `deleteTransaction(id)` server action (auth check + RLS-scoped delete + revalidatePath)
- `src/components/transactions/DeleteTransactionButton.tsx` — **new** — Dialog confirm trigger with `useTransition` + sonner toast; supports `variant: 'desktop' | 'mobile'`
- `src/components/transactions/TransactionTable.tsx` — added trailing action column; icon fades in on `group-hover` / `focus-within`
- `src/components/transactions/TransactionDayList.tsx` — expanded grid to 4 columns; delete icon always visible at row's right edge on mobile

## Deferred to next session

- Bulk select / multi-delete
- "Find duplicates" smart action (the original ask before the change of plan)
- Undo toast / soft delete
- Swipe-to-delete on mobile

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
