# Transaction Notes UI + Claude Awareness

**Date:** 2026-05-27
**Branch:** feature/transaction-notes-ui
**Worktree:** `/Users/peteroomen/personal/budget-app-tx-notes`
**Roadmap item:** Phase 5 — Polish (Transaction notes UI + Claude awareness)

## Goal

Make the existing `transactions.notes` column visible, editable inline, and visible to Claude in both chat context and monthly summary prompts. By end of session: a user can attach a free-text note like _"normal — dog vet, every 3 months"_ to any transaction; the note renders under the merchant on desktop + mobile; Claude sees noted transactions when answering chat questions and when writing the monthly recap.

## Approach

### Schema

No migration needed. `transactions.notes text` already exists (nullable).

### Server action

Add `setTransactionNote(id, note)` to `src/lib/actions/transactions.ts`:

- `auth.getUser()` gate (RLS scopes the row to household via account ownership).
- Trim input; empty string → `null` (clearing).
- Cap server-side at 500 chars (defensive — UI also caps).
- `supabase.from('transactions').update({ notes }).eq('id', id)`.
- `revalidatePath('/transactions')` + `revalidatePath('/summary')` + `revalidatePath('/chat')` on success so Claude sees fresh notes immediately.

### UI — `NotePopover` component (new)

`src/components/transactions/NotePopover.tsx` — client component, used on both desktop table and mobile day list.

- Trigger: small `Pencil` icon button (lucide-react). Variant `desktop` → muted icon visible only on row hover (`group-hover` / `focus-within` driven by the parent row); variant `mobile` → always visible, slightly larger tap target.
- Popover content: label "Note for {merchant}", controlled `<Input>` (single line, `maxLength={500}`), `Save` + `Cancel` buttons. Existing note text pre-fills the input.
- Save flow: `useTransition` wraps the action. On success, `setOpen(false)` + `toast.success("Note saved")`. On error, popover stays open + `toast.error(message)`.
- Clearing: empty input + Save → action receives empty string → server writes null. Tooltip on input: "Leave empty to clear."
- Keyboard: Enter saves, Esc closes (shadcn Popover handles Esc).

### TransactionTable.tsx — desktop

- Inline note line: directly under merchant `<p>`, render `tx.notes` as `<p className="mt-0.5 text-label italic text-muted-foreground">` when non-empty. Truncate with `line-clamp-2` so it doesn't blow up row height for long notes.
- Pencil affordance: append `<NotePopover variant="desktop" ... />` to the right of merchant name (small icon button, `text-muted-foreground hover:text-foreground`). Wrap in `opacity-0 group-hover:opacity-100 focus-within:opacity-100` so it follows the same reveal pattern as the existing trailing delete icon — but only when the note is empty (when a note exists, render the pencil inline next to the note line so it's discoverable).
- Spec for "has note": pencil sits at end of the note line, always visible. Spec for "no note": pencil hidden until hover, sits next to merchant name.

### TransactionDayList.tsx — mobile

- Note line: under the category line, italic muted, single line truncated. `line-clamp-1` (mobile is tighter — full note revealed by tapping pencil).
- Pencil affordance: always-visible muted pencil sitting in a 4th grid column? No — that breaks the existing `9px 1fr auto auto` grid. Simpler: tuck the pencil at the end of the merchant column (small inline icon next to the merchant text, always visible on mobile since there's no hover). Tapping it opens the popover.

### Chat context (`src/lib/queries/chat-context.ts`)

- Add `notes` to the transactions select.
- Extend `ChatContext.currentTransactions` row type with `notes: string | null`.
- In `formatChatContext`, when a transaction has a non-empty note append ` — note: {note}` at the end of the line. Keeps the format compact and inline so Claude doesn't need to look it up separately.

### Summary prompt (`src/lib/queries/summary.ts`)

- Fetch `notes` in the current-month transactions query.
- Add `notedTransactions: Array<{ date: string; merchant: string; amount_cents: number; note: string }>` to `SummaryContext`. Populate from current-month rows where `notes` is non-null & non-empty; sort by date ascending; cap at 30 entries (defensive — unlikely to hit).
- In `buildSummaryPrompt`, if `notedTransactions.length > 0`, append a "Transactions with notes ({monthLabel}):" section listing each as `- {date}, {merchant}, {amount}, note: {note}`. Comes _before_ the closing JSON-format instruction.
- No change to the JSON response schema — Claude can incorporate notes into `notablePatterns` or `spendNote` as appropriate. The prompt's existing `notablePatterns` field is the natural home.

### Out-of-scope alternatives considered

- **Textarea for multi-line notes.** shadcn `textarea` not installed; single-line `Input` covers the roadmap example. Add later if note length becomes a felt limitation.
- **Note column in the desktop table.** Wider, mostly-empty column. Inline-under-merchant feels denser and more native to a budgeting app.
- **Edit-in-place (no popover).** Considered but inconsistent with the existing per-row patterns; popover gives clearer affordance and isolates the input from the row layout.
- **Showing notes on the dashboard.** Not requested. Notes are detail-level; the dashboard is for aggregates.
- **Flagged-for-review surface** that consumes notes as dismissal markers — that's a separate roadmap item ("Unusual transaction flagging") that depends on this one. Out of scope today.

## Steps

- [ ] 1. **Worktree**: `git worktree add ../budget-app-tx-notes -b feature/transaction-notes-ui main` from the main checkout.
- [ ] 2. **Server action**: add `setTransactionNote(id, note)` to `src/lib/actions/transactions.ts` (auth gate, trim/null logic, 500-char cap, revalidate `/transactions` + `/summary` + `/chat`).
- [ ] 3. **NotePopover component**: `src/components/transactions/NotePopover.tsx` — Popover + Input + Save/Cancel + `useTransition` + sonner toast. `variant: 'desktop' | 'mobile'`.
- [ ] 4. **TransactionTable.tsx**: render note under merchant when present; add pencil affordance (hover-revealed when empty, inline next to note when present).
- [ ] 5. **TransactionDayList.tsx**: render note under category line (line-clamp-1); always-visible pencil inline next to merchant.
- [ ] 6. **chat-context.ts**: select `notes`; thread through `ChatContext.currentTransactions`; append ` — note: {note}` in `formatChatContext`.
- [ ] 7. **summary.ts**: select `notes`; build `notedTransactions`; render new "Transactions with notes" section before the JSON-format instruction in `buildSummaryPrompt`.
- [ ] 8. `pnpm lint` + `pnpm type-check` — fix any errors.
- [ ] 9. Local smoke test (see Manual test steps).
- [ ] 10. Update CLAUDE.md "Current State" + close out this plan file.

## Manual test steps

Boot locally: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm dev` (run from the worktree).

### Desktop happy path

- [ ] `/transactions` → hover any row → pencil icon fades in next to the merchant name (no note yet).
- [ ] Click pencil → Popover opens; title shows merchant; input is empty.
- [ ] Type "normal — dog vet, every 3 months" → Save → Popover closes, sonner toast "Note saved" appears.
- [ ] Row now shows the note as an italic muted line under the merchant. Pencil now visible inline next to the note line (always, not hover-gated).
- [ ] Click pencil again → input is pre-filled with the saved note → edit + Save → updated text shows.
- [ ] Clear: open pencil → delete all text → Save → note line disappears, pencil reverts to hover-revealed.

### Mobile happy path

- [ ] Resize to 360px or use device emulation. Day-grouped list: every row shows a small pencil at the end of the merchant line (always visible).
- [ ] Tap pencil → Popover opens. Type a note → Save → italic note line appears between category and amount block.
- [ ] Truncation: enter a long note (~150 chars) → mobile shows `line-clamp-1` truncation with ellipsis; desktop shows `line-clamp-2`.

### Claude awareness

- [ ] Add notes to 2–3 transactions in the current month (e.g. one on a VET, one on BUNNINGS).
- [ ] Open `/chat` → ask "What's notable this month?" → response should mention the noted transactions and may quote the note text.
- [ ] Open `/summary` for current month → wait for Claude's recap → `notablePatterns` (or `spendNote`) should reference at least one of the noted transactions in plain language.

### Edge / failure cases

- [ ] **500-char cap**: paste a 600-char string into the note input → input HTML truncates to 500; Save persists exactly 500 chars.
- [ ] **Whitespace-only**: enter `   ` → Save → server trims to empty → row's note line disappears (treated as clear).
- [ ] **Network error**: kill Supabase locally (or break the API key) → Save → toast.error, Popover stays open, no row update.
- [ ] **Keyboard**: open Popover, type, press Enter → saves. Open again, press Esc → closes without saving.
- [ ] **Two transactions, same merchant**: add a note to one VET CARE row → only that row shows the note line; the other VET CARE row is unchanged (notes are per-transaction, not per-merchant).
- [ ] **Recurring row with note**: confirm the recurring badge + manual badge + note line all coexist without layout breakage.
- [ ] **Delete a transaction that has a note**: trash icon → confirm → row disappears cleanly (note is on the row, so cascade is implicit).

## Out of scope for this session

- Multi-line / textarea notes
- Note-driven "Flagged for review" surface (separate roadmap item — Unusual transaction flagging)
- Showing notes on the dashboard
- Bulk note operations
- Search/filter by note text
- Notes on the summary `/summary` page UI (Claude consumes them but the page itself doesn't list them visually)
- Audit/history of edits to a note

---

<!-- Fill in below during/after the session -->

## What actually happened

Implementation matched the plan. A few small specifics worth noting for next session:

- **Popover affordance placement (desktop)**: kept consistent with the plan — when no note, pencil appears next to the merchant name (hover-revealed). When a note exists, the italic note line shows below the merchant and the pencil sits inline at the end of that line, always visible. This makes the note line itself feel less "dead" since the edit affordance lives where the eye is anyway.
- **Mobile**: chose to put the always-visible pencil next to the merchant name (not in a 4th grid column) to avoid disturbing the existing `9px 1fr auto auto` grid that the delete column lives in. Inline next to merchant keeps the row visually tight while still being tappable.
- **Note display in chat context**: appended ` — note: {note}` to each transaction line in `formatChatContext`. This is the most compact form — Claude sees the note inline with the transaction it annotates, no separate section needed.
- **Note display in summary prompt**: new "Transactions with notes" section right before the JSON-format instruction; capped at 30 entries with a defensive `slice`. Added explicit guidance: _"Use these to inform notablePatterns or spendNote; do not invent commentary about un-noted transactions"_ to prevent Claude over-quoting notes when they're sparse.
- **tsconfig.json drift**: same `next lint` first-run quirk as the tx-row-delete session — `next lint` auto-rewrote `tsconfig.json`. Reverted via `git checkout tsconfig.json` to keep the diff focused on this feature.
- **No schema/migration changes** — `notes text` already existed.
- Type-check + lint clean. Browser smoke test handed off to the user (see Manual test steps above).

## Files created / modified

- `src/lib/actions/transactions.ts` — added `setTransactionNote(id, note)` server action (auth-gated, trims, 500-char cap, revalidates `/transactions` + `/summary` + `/chat`)
- `src/components/transactions/NotePopover.tsx` — **new** — pencil-icon trigger opens a shadcn `Popover` with `Input` + Save/Cancel + `useTransition` + sonner toast; supports `variant: 'desktop' | 'mobile'`
- `src/components/transactions/TransactionTable.tsx` — italic muted note line under merchant when present (line-clamp-2); pencil hover-revealed when no note, inline next to note line when one exists
- `src/components/transactions/TransactionDayList.tsx` — always-visible pencil inline next to merchant on mobile; italic note line below category (line-clamp-1)
- `src/lib/queries/chat-context.ts` — selects `notes`; `ChatContext.currentTransactions` gains `note: string | null`; `formatChatContext` appends ` — note: …` to each transaction line
- `src/lib/queries/summary.ts` — selects `date` + `notes`; new `NotedTransactionRow` type + `notedTransactions[]` on `SummaryContext`; `buildSummaryPrompt` appends "Transactions with notes" section before the JSON-format instruction

## Deferred to next session

- Multi-line / textarea notes (single-line `Input` covers the roadmap example)
- Note-driven "Flagged for review" surface (separate roadmap item — Unusual transaction flagging — explicitly depends on this)
- Showing noted transactions on the `/summary` page UI itself (Claude consumes them; the page doesn't render them visually)
- Search/filter transactions by note text
- Bulk note operations / per-merchant note default

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
