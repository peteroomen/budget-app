# Import Summary — Preview/Confirm Flow

**Date:** 2026-05-29  
**Branch:** feature/import-summary  
**Roadmap item:** Phase 5 — Build order #17 (Import summary)

## Goal

Replace the current single-step "upload → insert" import with a two-step preview/confirm flow. After uploading, the user sees a breakdown of what will happen (X new, Y duplicates skipped, Z from merchant memory, W from Claude, N uncategorised) before any rows are committed to the DB. Adds an `import_history` table and surfaces a "Recent imports" list on the import page.

## Approach

### Two-step server action split

`importStatement` is a monolith that parses, deduplicates, categorises, and inserts in one call. Split into:

- **`analyseImport(formData)`** — parses file, deduplicates against existing transactions, runs merchant map lookup + Claude categorisation — but does NOT insert anything. Returns a typed result with the full transaction list + stats + new merchant mappings.
- **`commitImport(params)`** — receives the analysed data (from React state), inserts transactions, upserts new merchant mappings to `merchant_category_map`, writes to `import_history`, revalidates cache.

Key behaviour change: merchant map is only updated after the user confirms, not during analysis.

### State machine in ImportForm

Replace `useActionState(importStatement, initial)` with explicit React state + `useTransition`:

```
idle  →  analysing  →  preview  →  committing  →  success
                    ↘  error                  ↘  error
```

React state holds the full `AnalyseSuccess` object between preview and confirm (no DB temp storage needed — all in-memory). On "Cancel", state resets to idle.

### New `import_history` table

Tracks every confirmed import with detailed breakdown stats. Scoped by `household_id` for direct RLS. `account_id` is nullable ON DELETE SET NULL so records survive account deletion.

The existing `uploads` table is left in place (historical records) but new code writes to `import_history` only.

### Recent imports card

Add a "Recent imports" list (last 5) to the import page, populated from `import_history`. Shown below the upload form.

## Steps

- [ ] 1. **Branch**: `git checkout -b feature/import-summary` in the worktree
- [ ] 2. **Migration**: `supabase/migrations/20260529000000_import_history.sql` — create `import_history` table + RLS policies
- [ ] 3. **Types**: create `src/lib/types/import.ts` — `AnalysedTransaction`, `NewMerchantMapping`, `ImportStats`, `AnalyseSuccess`, `AnalyseResult`, `CommitResult`
- [ ] 4. **Refactor `src/lib/actions/import.ts`**: add `analyseImport` + `commitImport`; remove `importStatement` (or leave for type reference); export new types
- [ ] 5. **New component `src/components/import/ImportPreview.tsx`**: stats grid (5 tiles: New / Duplicates / From memory / From Claude / Uncategorised) + format badge + "Confirm Import" + "Cancel" buttons
- [ ] 6. **Refactor `src/components/import/ImportForm.tsx`**: swap `useActionState` for `useState` + `useTransition`; wire analyse → preview → confirm → success flow
- [ ] 7. **Query `src/lib/queries/import-history.ts`**: `getRecentImportHistory()` — last 5 records joined with account name
- [ ] 8. **Update `src/app/(app)/import/page.tsx`**: fetch recent imports, render "Recent imports" card
- [ ] 9. **Update `docs/schema/current.md`** — add `import_history` table
- [ ] 10. `pnpm lint` + `pnpm tsc --noEmit` — fix all errors
- [ ] 11. Update CLAUDE.md + fill in plan file sections below
- [ ] 12. Commit + push `feature/import-summary`; open PR

## Type definitions (src/lib/types/import.ts)

```typescript
export interface AnalysedTransaction {
  date: string // YYYY-MM-DD
  amountCents: number
  description: string
  merchantName: string | null
  categoryId: string | null
  categorySource: 'map' | 'claude' | null
  source: 'csv' | 'pdf'
}

export interface NewMerchantMapping {
  merchantName: string
  categoryId: string
}

export interface ImportStats {
  newCount: number // to be / was inserted
  duplicates: number // skipped
  fromMap: number // categorised from merchant map
  fromClaude: number // categorised by Claude AI
  uncategorised: number // no category
}

export type AnalyseSuccess = {
  ok: true
  transactions: AnalysedTransaction[]
  newMerchantMappings: NewMerchantMapping[]
  stats: ImportStats
  format: string // 'ANZ' | 'ASB' | 'Westpac' | 'BNZ' | 'PDF'
  fileType: 'csv' | 'pdf'
  accountId: string
  filename: string
}

export type AnalyseResult = AnalyseSuccess | { ok: false; error: string }

export type CommitResult = { error: null; stats: ImportStats } | { error: string }
```

## Migration schema (import_history)

```sql
CREATE TABLE import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  filename text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('csv', 'pdf')),
  bank_format text,                    -- 'ANZ' | 'ASB' | 'Westpac' | 'BNZ' | null (pdf)
  imported_count integer NOT NULL DEFAULT 0,
  duplicates_count integer NOT NULL DEFAULT 0,
  from_map_count integer NOT NULL DEFAULT 0,
  from_claude_count integer NOT NULL DEFAULT 0,
  uncategorised_count integer NOT NULL DEFAULT 0,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
-- SELECT and INSERT policies scoped to household via get_my_household_id()
```

## Manual test steps

Boot locally: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm dev`.

### Happy path — CSV

- [ ] Navigate to `/import`, select account, drop a CSV file
- [ ] Click "Analyse" — spinner appears; form is disabled during analysis
- [ ] Preview screen appears showing: New / Duplicates / From memory / From Claude / Uncategorised counts + format (e.g. "ANZ")
- [ ] Click "Confirm Import" — spinner; transitions to success screen
- [ ] Success shows final counts (same as preview's New + Duplicates)
- [ ] Navigate to `/transactions` — imported rows are there with correct categories
- [ ] Back to `/import` — "Recent imports" list shows this import at the top

### Happy path — PDF

- [ ] Same flow with a PDF file; preview shows format "PDF"; Claude-categorised count > 0

### Cancel flow

- [ ] Upload file → click Analyse → preview appears → click Cancel → form resets to idle (account + file cleared); no transactions were inserted

### All-duplicates file

- [ ] Re-upload the same CSV → preview shows `New: 0`, `Duplicates: N` → Confirm still allowed (inserts nothing, writes import_history with 0 imported)
- [ ] Success screen shows "0 imported, N duplicates skipped"

### Recent imports list

- [ ] After 2 imports, "Recent imports" card shows both entries with filename, account, date, imported count

### Edge / failure cases

- [ ] **No account selected**: submit button disabled
- [ ] **Unsupported format**: upload a .txt file → error message shown
- [ ] **PDF parse failure**: upload a non-statement PDF → error returned from analyse step; preview never shown
- [ ] **Network error during commit**: simulate by breaking connection → error shown on preview screen, cancel/retry available

## Out of scope for this session

- Auto-run recurring detection after import
- Linking import_history rows to specific transaction IDs
- Paginating the recent imports list (5 entries is sufficient)
- "Download" link for original file (not stored)
- Import history on a dedicated /imports history page
- Deleting import history records

---

## What actually happened

Implementation matched the plan closely. One TypeScript fix needed: `if (result.error)` doesn't narrow `CommitResult` because `error: string` could be an empty string (falsy), so TypeScript refuses to narrow to `{ error: null; stats }`. Changed to `if (result.error !== null)` which gives TypeScript an explicit null check to discriminate the union correctly.

`next lint` auto-rewrote `tsconfig.json` as in prior sessions — reverted with `git checkout tsconfig.json`.

The `accounts` join in `getRecentImportHistory` returns either an object or an array depending on whether it's a single or multi-row join; used an `Array.isArray` guard to handle both shapes at the type level.

## Files created / modified

- `supabase/migrations/20260529000000_import_history.sql` — **new** — `import_history` table + RLS SELECT + INSERT policies
- `src/lib/types/import.ts` — **new** — shared types: `AnalysedTransaction`, `NewMerchantMapping`, `ImportStats`, `AnalyseSuccess`, `AnalyseResult`, `CommitResult`
- `src/lib/actions/import.ts` — refactored — removed `importStatement`; added `analyseImport` (parse + dedup + categorise, no DB writes) and `commitImport` (insert transactions + upsert merchant map + write `import_history`)
- `src/components/import/ImportPreview.tsx` — **new** — 5-tile stats grid (New / Duplicates / From memory / From Claude / Uncategorised) + format label + Confirm/Cancel buttons
- `src/components/import/ImportForm.tsx` — refactored — replaced `useActionState` with `useState` + `useTransition`; 3-step state machine (idle → preview → success)
- `src/lib/queries/import-history.ts` — **new** — `getRecentImportHistory()` fetches last N records joined with account name
- `src/app/(app)/import/page.tsx` — updated — fetches recent import history; renders "Recent imports" card below upload form when records exist
- `docs/schema/current.md` — added `import_history` table; updated migration pointer + last-updated date
- `CLAUDE.md` — updated Current State section; marked build order #17 complete

## Deferred to next session

- Auto-run recurring detection after import (separate roadmap item)
- Linking `import_history` rows to specific transaction IDs
- Paginating "Recent imports" beyond 5 entries
- Dedicated `/imports` history page

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
