# Category Tracking Columns

**Date:** 2026-05-25  
**Branch:** feature/category-tracking  
**Roadmap item:** Phase 2 — Category source indicator + Locked merchant mappings (deferred refinements)

## Goal

Two new columns: `transactions.category_source` tracks how a category was assigned ('claude' | 'manual' | 'map'), and `merchant_category_map.is_manual` preserves manual overrides when "Re-categorise all" is run. The transaction list shows a pencil icon next to manually-overridden categories.

## Approach

**Migration 1** — `category_source text CHECK (category_source IN ('claude', 'manual', 'map'))` on `transactions`. Nullable — existing rows remain NULL.

**Migration 2** — `is_manual boolean NOT NULL DEFAULT false` on `merchant_category_map`. Existing rows get `false` (correct — they were created by AI or initial import, not by manual override).

**`import.ts`** — When building `toInsert` rows: set `category_source: 'map'` for merchant-map hits, `category_source: 'claude'` for AI hits, `null` for uncategorised. The `is_manual: false` field is added to all AI-generated merchant_category_map upserts.

**`transactions.ts` (`setCategoryOverride`)** — Set `category_source: 'manual'` on the transaction update. Call `upsertMerchantMapping` with `isManual: true`.

**`merchant-map.ts` (`upsertMerchantMapping`)** — Add `isManual: boolean = false` parameter; include `is_manual` in the upsert payload.

**`categorise.ts` (`recategoriseAll`)** — Instead of deleting all map entries: (1) fetch manual merchant names first, (2) delete only non-manual entries, (3) get distinct merchant names from transactions excluding manual-mapped ones, (4) run Claude only on those, (5) upsert new non-manual map entries, (6) update transactions with `category_source: 'claude'` (skipping manual-mapped merchants).

**`CategoryCell.tsx`** — Add `categorySource: string | null` prop; show a small pencil SVG icon (12×12, already inline in the file) when `categorySource === 'manual'`.

**`types/index.ts`** — Add `CategorySource` type, add `category_source` to `Transaction`, `is_manual` to `MerchantCategoryMap`.

**`queries/transactions.ts`** — Add `category_source` to `TransactionRow` type (the `select('*')` already retrieves it).

**`TransactionTable.tsx`** — Pass `categorySource={tx.category_source}` to `CategoryCell`.

## Steps

- [x] Write plan file
- [ ] Migration 1: `category_source` on `transactions`
- [ ] Migration 2: `is_manual` on `merchant_category_map`
- [ ] Update `src/types/index.ts` — `CategorySource` type, update `Transaction` and `MerchantCategoryMap`
- [ ] Update `src/lib/queries/transactions.ts` — add `category_source` to `TransactionRow`
- [ ] Update `src/lib/actions/merchant-map.ts` — `isManual` param on `upsertMerchantMapping`
- [ ] Update `src/lib/actions/transactions.ts` — set `category_source: 'manual'` + pass `isManual: true`
- [ ] Update `src/lib/actions/import.ts` — set `category_source` per row + `is_manual: false` on map upserts
- [ ] Update `src/lib/actions/categorise.ts` — skip manual merchants in recategoriseAll + set `category_source: 'claude'`
- [ ] Update `src/components/transactions/CategoryCell.tsx` — add `categorySource` prop + pencil indicator
- [ ] Update `src/components/transactions/TransactionTable.tsx` — pass `categorySource`
- [ ] Update `docs/schema/current.md`
- [ ] `pnpm lint` + `pnpm type-check`
- [ ] Commit + push + open PR

## Manual test steps

- [ ] Import a CSV — confirm newly inserted transactions have `category_source = 'map'` or `'claude'` in Supabase (no manual overrides yet, so none should be 'manual')
- [ ] In transaction list, change a category — confirm `category_source` updates to 'manual' in Supabase, and the pencil icon appears next to that transaction's category
- [ ] Check `merchant_category_map` — confirm the manually-overridden merchant has `is_manual = true`
- [ ] Click "Re-categorise all" — confirm manually-overridden transactions keep their category (not overwritten), while AI-assigned ones may change
- [ ] After re-categorise, confirm `is_manual = true` entries in `merchant_category_map` are still there
- [ ] Edge case: import a statement with a merchant that was previously manually overridden — confirm it picks up the manual map entry (category_source = 'map' since it came from the map, not AI) with the correct category

## Out of scope for this session

- "Reset to AI" per-merchant button (clears `is_manual` flag) — deferred to Phase 5 polish
- Displaying `category_source` as a tooltip or column in the transaction list (beyond the pencil icon)
- `category_source = 'map'` distinction in the UI (only 'manual' gets a visual indicator)

---

## What actually happened

- Two SQL migrations added: `category_source` check constraint on `transactions`, `is_manual boolean NOT NULL DEFAULT false` on `merchant_category_map`.
- `import.ts` uses `as 'claude' | 'map' | null` cast on the `toInsert` array to allow later reassignment when AI categorises a row (TypeScript narrows to `'map'` otherwise).
- `recategoriseAll` restructured: fetches manual merchants first, deletes only `is_manual = false` entries, then excludes manually-mapped merchants from the Claude batch and updates transactions with `category_source: 'claude'`.
- Pencil icon in `CategoryCell` uses an inline SVG (same pattern as the existing X icon in that file) — no new dependency needed.
- Lint and type-check both pass clean.

## Files created / modified

- `supabase/migrations/20260525000000_category_source.sql` — new
- `supabase/migrations/20260525000001_merchant_map_is_manual.sql` — new
- `src/types/index.ts` — added `CategorySource` type, `category_source` on `Transaction`, `is_manual` on `MerchantCategoryMap`
- `src/lib/queries/transactions.ts` — added `category_source` to `TransactionRow`
- `src/lib/actions/merchant-map.ts` — `isManual: boolean = false` param on `upsertMerchantMapping`
- `src/lib/actions/transactions.ts` — set `category_source: 'manual'` + pass `isManual: true`
- `src/lib/actions/import.ts` — set `category_source` per row + `is_manual: false` on AI map upserts
- `src/lib/actions/categorise.ts` — skip manual merchants, set `category_source: 'claude'`
- `src/components/transactions/CategoryCell.tsx` — added `categorySource` prop + pencil indicator
- `src/components/transactions/TransactionTable.tsx` — pass `categorySource`
- `docs/schema/current.md` — updated with new columns
- `docs/work/2026-05-25-category-tracking.md` — this plan file

## Deferred to next session

- "Reset to AI" per-merchant button (clears `is_manual` flag)
- Next build order item: #14 Chat agent / context injection

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
