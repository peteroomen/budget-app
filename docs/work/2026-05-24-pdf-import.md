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

The planned approach (pdfjs-dist text extraction → Claude parse) was abandoned entirely due to runtime failures:

1. **pdfjs-dist fails server-side** — `DOMMatrix is not defined`. pdfjs-dist is a browser library; it references browser globals that don't exist in Node.js. Attempted fixes (module-level polyfill, dynamic `import()`) both failed because ES module imports are hoisted — pdfjs-dist evaluates before any polyfill body runs.
2. **pdf-parse v2 also fails** — pdf-parse v2 wraps pdfjs-dist internally. Same webpack `Object.defineProperty called on non-object` error. No viable path with either library.
3. **Decision: drop PDF extraction libs entirely.** Claude's API supports passing a raw PDF as a base64 `document` content block — the model reads it natively. No text extraction step needed. `next.config.ts` reverted to empty.

**Architecture shift — unified import form:** Rather than two separate forms in tabs (CSV | PDF), unified into a single `ImportForm` with a `accept=".csv,.pdf"` file picker. The `importStatement` server action dispatches to `handleCsv` or `handlePdf` based on file extension. Cleaner UX, less code.

**Model issues during testing:**

- Started with `claude-haiku-4-5` — 8K output token ceiling truncated large multi-month statements mid-JSON.
- Switched to Sonnet, but used `claude-sonnet-4-5-20251001` (non-existent model ID) — got 404.
- Fixed to `claude-sonnet-4-6` (correct current ID). `max_tokens: 16000`.

**Other robustness fixes discovered during testing:**

- Claude occasionally wraps JSON in markdown fences despite being asked not to — added regex strip before `JSON.parse`.
- Prompt updated to request compact single-line JSON to reduce output token count.
- Import button stayed enabled after a failed import cleared the file input — added `hasFile` state with `onChange` tracking to fix.
- `response.content[0]` possibly `undefined` under TypeScript strict `noUncheckedIndexedAccess` — fixed with null guard.

## Files created / modified

- `src/lib/actions/import.ts` — unified server action; `handleCsv` + `handlePdf` (Claude document block); replaces separate `import-pdf.ts`
- `src/components/import/ImportForm.tsx` — unified client form with `hasFile` state; replaces `CsvImportForm` and `PdfImportForm`
- `src/app/(app)/import/page.tsx` — simplified (no tabs)
- `next.config.ts` — reverted to empty (no pdfjs-dist workarounds needed)
- `CLAUDE.md` — stack section updated to reflect Claude-native PDF approach
- `docs/work/2026-05-24-pdf-import.md` — this plan file

**Deleted:**

- `src/lib/parsers/pdf.ts`
- `src/lib/actions/import-pdf.ts`
- `src/components/import/CsvImportForm.tsx`
- `src/components/import/PdfImportForm.tsx`

## Deferred to next session

- End-to-end manual test with a real ANZ PDF (no PDF test fixture in repo)
- Westpac/ASB PDF support (prompt is generic NZ bank format; may need tuning per bank)
- Consider pre-extracting PDF text in future if Claude token costs become a concern on large statements
- Transaction list UI (build order item #6) — next up

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
