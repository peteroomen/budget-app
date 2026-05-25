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

## Test data

**Available files in `test-data/`:**

| File                | Rows | Notes                                                              |
| ------------------- | ---- | ------------------------------------------------------------------ |
| `anz-may-2026.csv`  | 37   | Full May — ~30 unique merchants, good for first import             |
| `anz-june-2026.csv` | 24   | All merchants already in May → exercises the map path              |
| `anz-july-2026.csv` | 25   | Same merchants again, different month                              |
| `anz-sample.csv`    | 25   | Subset of May, has card-number suffixes (`PAKNSAVE PAPAKURA 1234`) |

**Use `anz-may-2026.csv` and `anz-june-2026.csv` (same account).**

Note: June's `PAKNSAVE PAPAKURA 9821 4455` normalises to `PAKNSAVE PAPAKURA` — it should hit the map from the May import (tests the normaliser + map lookup chain).

## Manual test steps

**Step 1 — Import May (exercises `category_source = 'claude'`)**

- [ ] Go to `/import`, select your ANZ account, upload `test-data/anz-may-2026.csv`
- [ ] Go to `/transactions` — confirm 37 rows appear, all with a category assigned
- [ ] In Supabase → Table editor → `transactions`, filter by `account_id`: confirm all new rows have `category_source = 'claude'`
- [ ] In `merchant_category_map`, confirm all new entries have `is_manual = false`

**Step 2 — Manual override (exercises `category_source = 'manual'` + pencil icon)**

- [ ] Find the `COUNTDOWN TAKANINI` row (01/05/2026, -$89.43) in the transaction list
- [ ] Change its category to something wrong (e.g. "Shopping") — the dropdown is in the Category column
- [ ] Confirm a small pencil icon appears next to "Shopping" in that row
- [ ] In Supabase → `transactions`, confirm that row now has `category_source = 'manual'`
- [ ] In Supabase → `merchant_category_map`, find `COUNTDOWN TAKANINI` — confirm `is_manual = true`

**Step 3 — Import June (exercises `category_source = 'map'`)**

- [ ] Upload `test-data/anz-june-2026.csv` against the same account
- [ ] Confirm 24 new rows appear (no duplicates — different month)
- [ ] In Supabase → `transactions` for June rows: confirm `category_source = 'map'` on all of them
- [ ] Confirm `COUNTDOWN TAKANINI` (Jun) has `category_source = 'map'` and inherits the wrong category ("Shopping") — expected, since the map entry was set by the manual override in Step 2
- [ ] Confirm `PAKNSAVE PAPAKURA 9821 4455` normalised correctly and also got `category_source = 'map'`

**Step 4 — Re-categorise all (exercises `is_manual` preservation)**

- [ ] Click "Re-categorise all" on the transactions page
- [ ] After it completes, find the `COUNTDOWN TAKANINI` rows — confirm they still show "Shopping" (manual override preserved)
- [ ] Confirm `COUNTDOWN TAKANINI` in `merchant_category_map` still has `is_manual = true`
- [ ] Confirm other merchants (e.g. `NETFLIX`, `ELC PAPAKURA`) were re-categorised (may or may not change, but `category_source` on their transactions should now be `'claude'`)
- [ ] Edge case: confirm no `is_manual = true` entries were deleted from `merchant_category_map`

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
