# AI Categorisation

**Date:** 2026-05-24  
**Branch:** feature/ai-categorisation  
**Roadmap item:** Phase 2 — AI Categorisation (build order item #9)

## Goal

Every imported transaction with an unmapped merchant gets auto-categorised by Claude. A "Re-categorise all" button on the transactions page lets users reset and rerun categorisation across all transactions.

## Approach

Merchant memory (item #8) already handles the happy path: known merchants get their category from `merchant_category_map` instantly. This session adds Claude as the fallback for unmapped merchants.

**Shared utility (`src/lib/categorise.ts`):** A plain async function (not a server action) that accepts merchant names + categories, calls Claude with a NZ-specific few-shot prompt, and returns a `Map<string, string>` (merchant_name → category_id). Both the import action and the re-categorise action call this.

**Import integration:** After the existing merchant map lookup in `importStatement`, any `toInsert` rows that still have `category_id: null` go through Claude. Results are applied to those rows before insert, and also upserted to `merchant_category_map` for future imports.

**Re-categorise all:** A server action that (1) clears the household's `merchant_category_map`, (2) fetches all distinct merchant names from transactions, (3) runs Claude categorisation, (4) upserts the new map, (5) bulk-updates transactions to apply the new categories (looping by merchant — acceptable for private 2-person household volume).

**Inline category override** is already implemented from merchant memory — no changes needed there.

**No DB migrations** — uses existing `merchant_category_map` and `transactions` tables.

## Steps

- [x] Write plan file
- [x] `src/lib/categorise.ts` — `categoriseMerchantsWithClaude(names, categories)` → `Map<string, string>`
- [x] `src/lib/actions/categorise.ts` — `recategoriseAll()` server action
- [x] Update `src/lib/actions/import.ts` — call Claude for unmapped merchants post-import
- [x] `src/components/transactions/RecategoriseButton.tsx` — client button with pending state
- [x] Update `src/app/(app)/transactions/page.tsx` — render RecategoriseButton in heading area
- [x] `pnpm lint` + `pnpm type-check` — fix any errors
- [x] Commit + push + open PR

## Manual test steps

- [ ] Import a CSV with merchants not yet in the map — confirm all transactions arrive with a category assigned (check in `/transactions`)
- [ ] Import same file again — confirm duplicate detection works, no new rows inserted
- [ ] Check `merchant_category_map` in Supabase — confirm new merchant→category rows were created
- [ ] Import a second file with some of the same merchants — confirm they are categorised instantly (from map, no Claude call)
- [ ] In transaction list, manually change a category — confirm the override sticks and the merchant map updates
- [ ] Click "Re-categorise all" — confirm button shows loading state, then page refreshes with categories applied
- [ ] After re-categorise, check that transactions previously categorised from map still have correct (or improved) categories
- [ ] Edge case: "Re-categorise all" with zero transactions — confirm button does nothing / shows 0 updated
- [ ] Edge case: Claude returns a category name not in the list — confirm graceful fallback (row stays uncategorised rather than crashing)

## Out of scope for this session

- Budget charts and dashboard (items #10–12)
- Recurring detection
- Per-transaction "AI suggested this" indicator
- Confidence scores from Claude
- Token usage tracking / cost reporting

---

## What actually happened

- Merchant memory (item #8) was not yet merged to main; fast-forward merged `feature/merchant-memory` into `feature/ai-categorisation` as a base before adding AI categorisation work.
- Shared utility `src/lib/categorise.ts` houses the Claude API call — not a server action itself, callable from both import and the re-categorise action. Returns `Map<merchant_name, category_id>`, gracefully returning an empty map on Claude failures.
- Import action extended: after the merchant map lookup, any rows still with `category_id: null` are batched to Claude. Results are applied to the insert rows and upserted to `merchant_category_map` so they're remembered.
- `recategoriseAll` action: clears the household's full merchant map, fetches all distinct merchant names from existing transactions, calls Claude, upserts the new map, then loops through merchant→category pairs updating transactions.
- `RecategoriseButton` uses `useTransition` for a simple "Re-categorising…" loading state; no toast/alert on completion (page revalidates and categories are visible — sufficient for a private tool).
- Lint and type-check pass clean.

## Files created / modified

- `docs/work/2026-05-24-ai-categorisation.md` — this file
- `src/lib/categorise.ts` — new: shared `categoriseMerchantsWithClaude()` utility
- `src/lib/actions/categorise.ts` — new: `recategoriseAll()` server action
- `src/lib/actions/import.ts` — extended: AI categorisation for unmapped merchants on import
- `src/components/transactions/RecategoriseButton.tsx` — new: "Re-categorise all" button
- `src/app/(app)/transactions/page.tsx` — updated: renders RecategoriseButton in heading row

Also brought in from `feature/merchant-memory` (fast-forward merge):

- `src/lib/actions/merchant-map.ts`
- `src/lib/actions/transactions.ts`
- `src/lib/queries/merchant-map.ts`
- `src/components/transactions/CategoryCell.tsx`
- `src/components/transactions/TransactionTable.tsx` (updated)
- `src/app/(app)/transactions/page.tsx` (updated)

## Deferred to next session

- Dashboard charts (item #10) — next up

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
