# PDF Import Pipeline

**Date:** 2026-05-24  
**Branch:** feature/pdf-import  
**Roadmap item:** Phase 1 — Statement Import (build order item #5)

## Goal

A user can upload an ANZ PDF bank statement, the app extracts the text with pdfjs-dist, passes it to Claude for structured parsing, normalises the results, deduplicates, and stores transactions. Reuses the normalisation and deduplication logic from the CSV pipeline.

## Approach

Extend the existing `/import` page with a tabbed UI (shadcn Tabs: CSV | PDF). The PDF tab has the same account-selector + file-picker pattern as the CSV form.

On upload, the `importPdf` server action:

1. Reads the PDF bytes as an ArrayBuffer
2. Extracts all text with pdfjs-dist (text-only, no rendering — canvas not required)
3. Calls the Anthropic Claude API with a parsing prompt that asks for structured `{date, amount, description}[]` JSON
4. Parses and validates the JSON response
5. Converts dollar amounts → `amount_cents` (integer), normalises merchant names
6. Deduplicates against existing transactions (same hash as CSV: account+date+amount_cents+description)
7. Inserts new transactions + one `uploads` row

**pdfjs-dist server-side:** Disable the worker (`GlobalWorkerOptions.workerSrc = ''`) — not needed for text extraction. Add `canvas` to webpack externals in next.config.ts so webpack doesn't try to bundle the optional canvas dependency.

**Claude model:** `claude-haiku-4-5-20251001` — fast and cheap for deterministic extraction.

**Amount convention:** same as CSV — income positive, expenses negative. Claude prompt instructs NZ convention (debits are negative numbers).

## Steps

- [x] Write plan file
- [ ] Install `pdfjs-dist` and `@anthropic-ai/sdk`
- [ ] Update `next.config.ts` — add `canvas` to webpack externals
- [ ] `src/lib/parsers/pdf.ts` — `extractPdfText(buffer: ArrayBuffer): Promise<string>`
- [ ] `src/lib/actions/import-pdf.ts` — `importPdf` server action (extract → Claude → parse → normalise → dedupe → insert)
- [ ] `src/components/import/PdfImportForm.tsx` — client form, same pattern as `CsvImportForm`
- [ ] Update `src/app/(app)/import/page.tsx` — wrap existing form and new PDF form in shadcn Tabs
- [ ] Add shadcn Tabs component via `pnpm dlx shadcn@latest add tabs`
- [ ] `pnpm lint` + `pnpm type-check` — fix any errors
- [ ] Commit, push, open PR

## Manual test steps

- [ ] Navigate to `/import` — confirm two tabs appear: "CSV" and "PDF"
- [ ] Click "PDF" tab — confirm account selector and PDF file picker appear
- [ ] With no accounts: confirm "Add one first" prompt and disabled button
- [ ] Select account, upload a PDF file that is NOT a bank statement — expect Claude returns empty or error, helpful message shown
- [ ] Upload `test-data/anz-sample-statement.pdf` (if present) with a valid account — expect transactions inserted, count shown
- [ ] Re-upload same PDF — expect 0 inserted, N duplicates skipped
- [ ] Upload a non-PDF file (e.g. `.txt`) — expect "Only PDF files are supported" error
- [ ] Upload a very small/corrupt PDF — expect graceful error message

## Out of scope for this session

- Westpac/ASB PDF formats (ANZ confirmed — others TBD)
- Progress streaming for large PDFs
- Transaction list view (item #6)
- Categorisation (Phase 2)

---

<!-- Fill in below during/after the session -->

## What actually happened

- Installed `pdfjs-dist` v5.7.284 and `@anthropic-ai/sdk` v0.98.0.
- pdfjs-dist v5 main entry is `build/pdf.mjs` (ESM only). Added `serverExternalPackages: ['pdfjs-dist']` to `next.config.ts` so Next.js doesn't try to bundle it server-side, plus a webpack external for `canvas` (pdfjs-dist's optional rendering dep — not needed for text extraction).
- `GlobalWorkerOptions.workerSrc = ''` disables the worker for server-side text extraction; the library falls back to main-thread operation.
- TypeScript strict mode caught `response.content[0]` potentially being `undefined` (noUncheckedIndexedAccess) — fixed with a null guard before the `.type` check.
- Wrapped the existing CSV form in shadcn Tabs alongside the new PDF form. Installed shadcn `tabs` component via `pnpm dlx shadcn@latest add tabs`.
- `pnpm lint` and `pnpm type-check` both pass clean.

## Files created / modified

- `next.config.ts` — added `serverExternalPackages` and webpack `canvas` external
- `src/lib/parsers/pdf.ts` — `extractPdfText()` using pdfjs-dist (server-side, no worker)
- `src/lib/actions/import-pdf.ts` — `importPdf` server action (extract → Claude haiku → parse → normalise → dedupe → insert)
- `src/components/import/PdfImportForm.tsx` — client form, shadcn pattern matching CsvImportForm
- `src/app/(app)/import/page.tsx` — updated to tabbed layout (CSV | PDF)
- `src/components/ui/tabs.tsx` — new shadcn component
- `docs/work/2026-05-24-pdf-import.md` — this plan file

## Deferred to next session

- End-to-end manual test with a real ANZ PDF (no PDF test fixture in repo yet — Peter to add `test-data/anz-sample.pdf`)
- Westpac/ASB PDF support (prompt is generic NZ bank format; may need tuning)
- Transaction list UI (build order item #6)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
