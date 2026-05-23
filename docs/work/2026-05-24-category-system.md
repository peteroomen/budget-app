# Category System

**Date:** 2026-05-24  
**Branch:** feature/category-system  
**Roadmap item:** Phase 2 — Categories (build order item #7)

## Goal

Seed 18 default categories for existing households and provide a /categories management UI where users can list, add, rename, recolour, and delete categories.

## Approach

**Migration:** Seed default categories for all existing households using a `CROSS JOIN` against `households`. Categories are household-scoped (household_id NOT NULL), so seeding in a migration only covers households that exist at migration time. Since household setup is currently manual SQL and there is one household, this covers the current use case. ON DELETE SET NULL is already configured on `transactions.category_id`, so deleting a category safely nulls out references.

**System flag:** Default categories have `is_system = true`. These cannot be deleted via the UI (delete button is disabled with a tooltip). Users can still rename and recolour them.

**Delete confirmation:** User categories (is_system = false) show a delete button. Clicking it opens a Dialog with a generic warning that categorised transactions will become uncategorised. Confirm → delete. No pre-fetching of transaction counts in the list (the FK ON DELETE SET NULL handles it cleanly server-side).

**Color picker:** A grid of 16 preset color swatches (clickable buttons). Controlled via useState + hidden input — same pattern as shadcn Select in forms.

**UI pattern:** Mirrors the Accounts page — server page fetches data, renders a list, dialogs for add/edit.

## Steps

- [x] Create `feature/category-system` branch
- [ ] `supabase/migrations/20260524000001_seed_default_categories.sql` — seed 18 defaults for all households
- [ ] `src/lib/queries/categories.ts` — `getCategories()`
- [ ] `src/lib/actions/categories.ts` — `createCategory`, `updateCategory`, `deleteCategory`
- [ ] `src/components/categories/ColorPicker.tsx` — grid of 16 preset swatches (controlled + hidden input)
- [ ] `src/components/categories/AddCategoryDialog.tsx` — name + color, calls createCategory
- [ ] `src/components/categories/EditCategoryDialog.tsx` — pre-filled name + color, calls updateCategory
- [ ] `src/components/categories/CategoryRow.tsx` — row with color chip, name, system badge, edit/delete buttons
- [ ] `src/app/(app)/categories/page.tsx` — replace stub: fetch categories, render list + Add button
- [ ] `pnpm lint` + `pnpm type-check` — fix all issues
- [ ] Commit + push + open PR

## Manual test steps

- [ ] Navigate to `/categories` — expect the 18 default categories listed (seeded by migration)
- [ ] System categories show disabled delete button; edit button is active
- [ ] Click Edit on "Groceries" → rename to "Supermarket" + change color → Save → row updates
- [ ] Click Add category → enter "Petrol" + pick a color → Add → appears in list
- [ ] Click Delete on "Petrol" → confirmation dialog appears → Confirm → "Petrol" removed from list
- [ ] Click Delete on a system category — button should be disabled (not clickable)
- [ ] Edge case: Add category with empty name → validation error, no submit

## Out of scope for this session

- Transaction counts per category in the list view
- Trigger to auto-seed categories when a new household is created
- Reordering / sorting categories
- Assigning categories to transactions (Phase 2 AI items)

---

<!-- Fill in below during/after the session -->

## What actually happened

- `categories` table and `Category` type already existed from the initial scaffold — no schema migrations needed beyond the seed.
- Migration seeds all 18 default categories for existing households via CROSS JOIN — covers the one existing household (setup is manual SQL).
- ON DELETE SET NULL on `transactions.category_id` (already in schema) means delete is always safe — no transaction count pre-fetching needed.
- `deleteCategory` server action still guards against is_system deletion server-side to prevent direct API abuse.
- ColorPicker built as a controlled component (16 preset swatches + hidden input) — same pattern as shadcn Select in the accounts dialog.
- Edit dialog resets color state to the category's current color on close.
- No new shadcn components needed — reused Dialog, Button, Input, Label already installed.
- **Post-review fix:** Initial dialogs used `required` on the name input, which fires the browser's native constraint-validation bubble — visually inconsistent with the rest of the app. Replaced with manual validation in the submit handler; error surfaces as `text-sm text-destructive` inline text, matching how server errors are shown everywhere else.
- **Unique names:** Added after review. Migration `20260524000002` adds `UNIQUE (household_id, name)`. Server actions detect Postgres error code `23505` and return a friendly message rather than leaking the raw constraint error. Schema doc updated.

## Files created / modified

- `supabase/migrations/20260524000001_seed_default_categories.sql` — seeds 18 default categories for all existing households
- `supabase/migrations/20260524000002_category_unique_names.sql` — adds `UNIQUE (household_id, name)` constraint
- `src/lib/queries/categories.ts` — `getCategories()` ordered by system-first, then name
- `src/lib/actions/categories.ts` — `createCategory`, `updateCategory`, `deleteCategory`; both write actions handle `23505` with a friendly error
- `src/components/categories/ColorPicker.tsx` — 16-swatch color picker (controlled + hidden input)
- `src/components/categories/AddCategoryDialog.tsx` — add category dialog; client-side name validation (no native browser bubble)
- `src/components/categories/EditCategoryDialog.tsx` — edit name + color dialog; same validation fix
- `src/components/categories/DeleteCategoryButton.tsx` — delete with confirmation dialog; disabled for system categories
- `src/app/(app)/categories/page.tsx` — replaced stub: table of categories with color chip, type, edit/delete actions
- `docs/roadmap.md` — ticked off completed items, captured future considerations (icons, system category locking), marked Merchant Memory as next up
- `docs/schema/current.md` — added unique constraint to categories table

## Deferred to next session

- Trigger to auto-seed default categories when a new household is created (overkill for current 1-household setup)
- Transaction counts per category in the list view
- Build order item #8: Merchant memory (`merchant_category_map` table + lookup logic)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
