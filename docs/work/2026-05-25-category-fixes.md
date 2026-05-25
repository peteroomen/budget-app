# Category Fixes: Merge Dining categories + Add Housing

**Date:** 2026-05-25  
**Branch:** feature/category-fixes  
**Roadmap item:** Phase 5 — Polish (category set cleanup)

## Goal

Merge "Dining Out" and "Takeaways" into a single "Dining & Takeaways" category, and add a "Housing" system category for mortgage, rent, rates, and body corp fees. No UI changes required — this is a migration + prompt update.

## Approach

### Migration (single file)

The migration must handle live data safely across all households. Order matters:

1. **Rename** "Dining Out" → "Dining & Takeaways" (this becomes the survivor)
2. **Transactions:** reassign any rows where `category_id = takeaways.id` → `dining.id`
3. **Merchant map:** reassign `merchant_category_map` rows pointing at "Takeaways" → "Dining & Takeaways". If a merchant is already mapped to the new category, delete the duplicate (the `ON CONFLICT DO NOTHING` + DELETE approach).
4. **Budgets:** households may have budgets for both categories in the same month. Sum them using an `INSERT ... ON CONFLICT DO UPDATE SET amount_cents = ... + EXCLUDED.amount_cents` pattern, then delete the now-orphaned Takeaways budgets.
5. **Delete** the "Takeaways" category row.
6. **Insert** "Housing" as a system category with a slate/grey colour, positioned logically (after Insurance in the default set).

All steps are wrapped in a transaction for safety.

### Edge cases handled in migration

- Household has "Dining Out" only → renamed, nothing to merge
- Household has "Takeaways" only → renamed to "Dining & Takeaways" (rename Takeaways directly instead)
- Household has both → merge as above (most likely case for our household)
- Household has neither → no-op for merge steps; Housing still inserted

### Seed data

Update the initial seed migration (`categories` insert block) to reflect the new defaults: replace "Dining Out" and "Takeaways" with "Dining & Takeaways", and add "Housing".

### AI categorisation prompt

The prompt in `src/lib/categorise.ts` (or wherever the batch categorisation call lives) lists categories by name. Update it to:

- Remove "Dining Out" and "Takeaways" references
- Add "Dining & Takeaways"
- Add "Housing" with a description: mortgage repayments, rent, rates, body corp fees

### No UI changes needed

Categories are fetched dynamically from the DB everywhere (dropdowns, filters, charts). The rename propagates automatically once the migration runs.

## Steps

- [ ] Find the seed migration file and AI categorisation prompt location (quick grep before writing)
- [ ] Write migration: `supabase/migrations/20260525000002_merge_dining_add_housing.sql`
- [ ] Update the seed migration's category list
- [ ] Update the AI categorisation prompt
- [ ] Run migration locally: `supabase db push` (or `supabase migration up`)
- [ ] Verify in local DB: check categories table, spot-check transactions/merchant_map/budgets
- [ ] Run `pnpm lint` + `pnpm type-check`
- [ ] Commit and push branch

## Manual test steps

- [ ] **Categories list:** open `/settings?tab=categories` — "Dining & Takeaways" appears, "Dining Out" and "Takeaways" are gone, "Housing" appears
- [ ] **Transactions:** filter by "Dining & Takeaways" — all previously "Dining Out" and "Takeaways" transactions appear under it
- [ ] **Budgets page:** any previous Dining Out/Takeaways budgets are now shown under "Dining & Takeaways" (amounts summed if both existed for the same month)
- [ ] **Merchant map:** `/settings?tab=categories` → spot-check a known Takeaways merchant (e.g. Uber Eats) — it should now be mapped to "Dining & Takeaways"
- [ ] **Dashboard chart:** "Dining & Takeaways" bar appears, no orphaned bars for the old names
- [ ] **AI categorisation:** import a new transaction that would have gone to Takeaways — verify it lands in "Dining & Takeaways"
- [ ] **Housing:** assign a mortgage/rent transaction to "Housing" manually — it should stick
- [ ] **Edge case:** attempt to create a new category called "Takeaways" — unique constraint should allow it (it's gone from the DB), but that's not expected behaviour to test actively

## Out of scope for this session

- Transaction notes UI (separate Phase 5 item)
- Import summary (#17)
- Any visual changes to category management UI
- Icon picker for categories

---

## What actually happened

- Migration written as a PL/pgSQL `DO $$ BEGIN … END $$` block, iterating over households with both categories via a FOR loop. The loop handles transactions, merchant_category_map (delete duplicate mappings, then update remaining), and budgets (INSERT … ON CONFLICT DO UPDATE to sum amounts, then DELETE old rows).
- Seed migration updated in-place — "Dining Out" + "Takeaways" replaced with "Dining & Takeaways", "Housing" added after Utilities.
- `src/lib/categorise.ts` prompt updated: example output changed from "Takeaways" → "Dining & Takeaways", added a Category guidance block explaining "Dining & Takeaways", "Housing", and "Income" semantics for the NZ context.
- `pnpm lint` and `pnpm type-check` both passed clean — no code changes needed.

## Files created / modified

- `supabase/migrations/20260525000002_merge_dining_add_housing.sql` — new migration
- `supabase/migrations/20260524000001_seed_default_categories.sql` — updated seed category list
- `src/lib/categorise.ts` — updated AI prompt example + added category guidance block

## Deferred to next session

Nothing — all steps complete.

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
