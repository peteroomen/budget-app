# CSV Import Pipeline

**Date:** 2026-05-24  
**Branch:** feature/csv-import  
**Roadmap item:** Phase 1 — Statement Import (build order item #4)

## Goal

A user can upload a CSV bank statement, the app auto-detects the bank format, parses transactions, and stores them (with duplicate detection). No categorisation yet.

## Approach

Single `/import` route with a file picker (CSV only this session — PDF in item #5). On upload, the file goes to a server action that:

1. Parses with papaparse
2. Matches headers against known NZ bank format definitions (ANZ, ASB, Westpac, BNZ)
3. Normalises rows → `{date, amount_cents, description, merchant_name}`
4. Deduplicates against existing transactions (same account + date + amount_cents + description)
5. Inserts new transactions + one `uploads` row

**Amount convention:** income positive, expense negative — as specified in schema notes.

**Auto-detect only** — no manual column mapping UI (deferred to future phase).

**Merchant normalisation:** uppercase + strip trailing digits/card suffixes — `lib/parsers/normalise.ts` already exists per CLAUDE.md conventions; create it if absent.

## Steps

- [ ] Create `feature/csv-import` branch
- [ ] Fix roadmap: add "column mapping UI" as a future phase item
- [ ] `src/lib/parsers/bank-formats.ts` — define header patterns + column extractors for ANZ, ASB, Westpac, BNZ
- [ ] `src/lib/parsers/csv.ts` — `detectFormat()` + `parseRows()` using papaparse
- [ ] `src/lib/parsers/normalise.ts` — `normaliseMerchant(name: string): string` (if not already present)
- [ ] `src/lib/actions/import.ts` — `importCsv(formData)` server action: parse → normalise → dedupe → insert transactions + upload row
- [ ] `src/app/(app)/import/page.tsx` — upload page with account selector + file picker + result feedback
- [ ] Add `/import` to sidebar nav
- [ ] `pnpm lint` + `pnpm type-check`

## Manual test steps

- [ ] Navigate to `/import`, confirm the page loads and shows account selector + file picker
- [ ] With no accounts: confirm the "Add one first" prompt appears and Import button is disabled
- [ ] Select an account, upload `test-data/anz-sample.csv` — expect: "Import complete (ANZ)", 25 transactions added, 0 duplicates
- [ ] Re-import the same file — expect: 0 inserted, 25 duplicates skipped
- [ ] Upload a non-CSV file (e.g. a `.txt`) — expect: error "Only CSV files are supported"
- [ ] Upload a CSV with unrecognised headers — expect: error message listing the headers found

## Out of scope for this session

- PDF import (item #5)
- Manual column mapping UI (future phase)
- Transaction list view (item #6)
- Categorisation (Phase 2)
- Progress indicator for large files

---

## What actually happened

- papaparse not in deps — installed `papaparse` + `@types/papaparse`.
- TypeScript strict mode + `noUncheckedIndexedAccess` caused type errors in `bank-formats.ts`: array destructuring of `split('/')` and `Record<string,string>` indexed access both return `T | undefined`. Fixed by adding a `col()` helper and using `parts[0] ?? ''` pattern.
- Same issue hit `csv.ts` at `result.errors[0].message` — fixed with optional chaining.
- `description` field needed a non-undefined fallback in all bank parsers — used a `joinParts()` helper that filters empty strings.
- Lint and type-check both pass clean.

## Files created / modified

- `src/lib/parsers/bank-formats.ts` — format definitions for ANZ, ASB, Westpac, BNZ
- `src/lib/parsers/csv.ts` — `parseCsv()` using papaparse + format detection
- `src/lib/parsers/normalise.ts` — `normaliseMerchant()` (uppercase + strip trailing digits)
- `src/lib/actions/import.ts` — `importCsv` server action (parse → dedupe → insert transactions + upload row)
- `src/components/import/CsvImportForm.tsx` — client form component with `useActionState`
- `src/app/(app)/import/page.tsx` — server page, fetches accounts, renders form
- `src/app/(app)/layout.tsx` — added Import to nav
- `docs/roadmap.md` — noted manual column mapping UI deferred to Phase 5
- `docs/schema/current.md` — corrected account_type enum values in table description

## Deferred to next session

- PDF import pipeline (build order item #5)
- Transaction list UI (build order item #6) — imported transactions aren't viewable yet
- Manual column mapping UI for unrecognised bank formats (Phase 5)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
