# Tide — Layout, Structure & Feature Pass

**Date:** 2026-05-25  
**Branch:** feature/tide-pages  
**Roadmap item:** Phase 5 — Polish (closing the gap between design prototype and shipped code)

## Goal

Bring the six remaining pages into structural conformance with the design prototype and add the two functional features (transaction search + category filter) that were spec'd in the handoff but missed.

## Gap analysis (prototype vs shipped)

| Page         | Gap                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Transactions | Missing: merchant text search, category filter dropdown                                                                                    |
| Import       | Plain file input vs dropzone; no "What we support" card; success state is basic                                                            |
| Chat         | Assistant messages have `bg-muted` bubble (prototype: no bubble, just sparkle avatar); no prompt chips                                     |
| Budgets      | Missing 4 KPI stat cards at top                                                                                                            |
| Summary      | Missing: Sparkles icon in headline card; inline Spend/Income/Net stats in Overview card; compare bars in vs-last-month card; H1 copy wrong |
| Dashboard    | Missing "Manage budgets →" link in chart card header; "All →" link in top merchants header                                                 |

## Approach

Work in `../budget-app-tide-pages` worktree. Pure UI/structural pass except for Transactions which needs a small query extension. Execute in risk order: non-breaking visual → structural → query change.

## Steps

### 1. Dashboard — add card header action links

- [ ] `SpendByCategoryChart.tsx`: Add `<Link href="/budgets">` "Manage budgets ↗" button to card header (ghost sm, ArrowUpRight icon)
- [ ] `TopMerchantsTable.tsx`: Add `<Link href="/transactions">` "All ↗" button to card header

---

### 2. Chat — assistant style + prompt chips

- [ ] `Thread.tsx`: Remove `bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5` wrapper from `AssistantMessage` — replace with a flex row: 28px sparkle avatar circle (`bg-muted`, `text-primary`, `Sparkles` icon 14px) + plain text div
- [ ] `Thread.tsx`: Add `PROMPT_CHIPS` array of 4 suggestion strings to the `ThreadPrimitive.Empty` state — render as clickable pill buttons below the subtitle. On click, submit the prompt via `useThreadRuntime().append()` from `@assistant-ui/react`
- [ ] `ChatPanel.tsx`: Update H1 text to "Chat with your finances"; add subtitle "Powered by Claude · session only"

---

### 3. Import — dropzone + support card + success redesign

- [ ] Create `src/components/import/DropZone.tsx`: styled div with `onDragOver/onDragLeave/onDrop` + hidden `<input type="file" ref>` triggered on click. States: idle (dashed border `border-2 border-dashed border-border bg-muted/40`), dragging (`border-primary bg-primary/5`). Inside: 48px upload icon circle (`bg-card border border-border text-primary`) + `font-display text-[16px]` heading + muted subtext
- [ ] `ImportForm.tsx`: Replace `<Input type="file">` with `<DropZone>`. DropZone calls `onFile(File)` → sets `hasFile` and stores file ref. Keep existing account select, server action, pending state.
- [ ] `ImportForm.tsx`: Add "What we support" card below form (static: ANZ CSV+PDF / ASB CSV / Westpac CSV / BNZ CSV — 2-col grid of bordered cells)
- [ ] `ImportForm.tsx`: Redesign success state — centered layout: success circle icon (52px, `bg-success/15 text-success`), `font-display text-display-hero-sm` "Imported successfully", stats grid (Imported / Duplicates / AI-categorised counts in `font-display text-display-metric`), "Review transactions" primary button + "Import another" ghost button

---

### 4. Budgets — KPI stat row

- [ ] `src/app/(app)/budgets/page.tsx`: Compute totals from `items` (`totalBudget`, `totalSpent`, `remaining`, `overCount`). Render 4-stat mini-cards above the table: "Total budget" / "Spent" / "Remaining" / "Over budget". Use shared `StatCard` pattern (label-caps label, `font-display text-display-metric` value). Each is a `<Card>` in `grid-cols-2 md:grid-cols-4 gap-3`.

---

### 5. Summary — headline, inline stats, compare bars

- [ ] `src/app/(app)/summary/page.tsx`: Change H1 copy to "Monthly recap". Add dateline subtitle: `font-display italic text-body-sm text-muted-foreground` reading "Generated [date] · powered by Claude"
- [ ] `SummaryDisplay.tsx`: Headline card — add `<Sparkles>` icon + `<span>` month label (label-caps uppercase, `text-primary`) above the headline paragraph
- [ ] `SummaryDisplay.tsx`: Spend Overview card — add inline stats row at bottom (after the prose): three `BigStat` cells for Spend / Income / Net. `BigStat` shows muted label, `font-display text-display-metric` value, optional delta arrow in `text-success` / `text-destructive`. Use `ctx.spend_cents`, `ctx.income_cents`, `ctx.net_cents`
- [ ] `SummaryDisplay.tsx`: vs Last Month card — add `CompareBars` below the prose. Shows two horizontal bars (prior month muted, current month primary) with label + value. Use `ctx.priorMonthSpend` and `ctx.spend_cents`
- [ ] Pass `ctx` to `SummaryDisplay` (it already receives it — just use the extra fields)

---

### 6. Transactions — search + category filter

- [ ] `src/lib/queries/transactions.ts`: Add `search?: string` and `categoryId?: string` to `TransactionFilters` interface. In `getTransactions`: add `.ilike('merchant_name', '%${search}%')` when `search` set; add `.eq('category_id', categoryId)` when `categoryId` set
- [ ] `src/app/(app)/transactions/page.tsx`: Read `sp.q` and `sp.cat` from searchParams. Pass to `getTransactions`. Pass `categories` to `TransactionFilters` (already fetched). Add `q`/`cat` to `urlParams` for sort links. Update "filtered" indicator to include `sp.q` and `sp.cat`
- [ ] `src/components/transactions/TransactionFilters.tsx`:
  - Add `categories: Category[]` prop (import `Category` from `@/types`)
  - Add controlled search input: magnifying glass icon, `w-64`, debounced push on change (use `setTimeout` 300ms, clear on unmount) — pushes `{ q: value }`
  - Add category `Select` (same pattern as account select) — pushes `{ cat: value }`
  - Update "Clear filters" to also clear `q` and `cat`
  - Layout: search input first, then account, then category, then date pickers

---

## Manual test steps

**Dashboard**

- [ ] "Manage budgets ↗" appears in chart card header and navigates to `/budgets`
- [ ] "All ↗" appears in merchants card header and navigates to `/transactions`

**Chat**

- [ ] Empty state shows 4 prompt chips. Clicking one sends that message
- [ ] Assistant replies have NO background bubble — just sparkle avatar + plain text
- [ ] User messages still have the sage green bubble
- [ ] H1 reads "Chat with your finances"

**Import**

- [ ] Dropzone renders with dashed border and upload icon
- [ ] Dragging a file over it highlights the border in primary green
- [ ] Dropping a file (or clicking and selecting) populates the hidden file input
- [ ] "What we support" card shows below with 4 bank cells
- [ ] Submit with a valid file → success state shows stat grid + "Review transactions" button
- [ ] "Import another" resets the form

**Budgets**

- [ ] 4 KPI stat cards show at top: Total budget / Spent / Remaining / Over budget
- [ ] Values match the actual data

**Summary**

- [ ] H1 reads "Monthly recap"
- [ ] Dateline subtitle shows generated date
- [ ] Headline card has Sparkles icon + month label above headline text
- [ ] Spend Overview card has Spend / Income / Net stat row at bottom
- [ ] vs Last Month card has compare bars (if prior month data exists)

**Transactions**

- [ ] Search input appears left of filter row
- [ ] Typing a merchant name filters the table in real time (via URL param, brief navigation)
- [ ] Category dropdown filters to that category
- [ ] Account filter still works
- [ ] "Clear filters" clears all three (search + category + account/dates)
- [ ] Edge: no results → table shows empty row with message
- [ ] Edge: search clears on navigating away (URL param gone)

## Out of scope for this session

- Import recent-imports history list (no `import_history` table in schema)
- Import processing/progress animation (server action is synchronous)
- Summary "Regenerate" button (server component, would need route handler)
- Summary "Export" button
- Dashboard bottom row (recent transactions + quick actions) — prototype has it but it duplicates the transactions page; lower value
- Sidebar collapse to 64px
- Header search

## Files to create / modify

**New files:**

- `src/components/import/DropZone.tsx`

**Modified files:**

- `src/lib/queries/transactions.ts`
- `src/app/(app)/transactions/page.tsx`
- `src/components/transactions/TransactionFilters.tsx`
- `src/app/(app)/budgets/page.tsx`
- `src/app/(app)/summary/page.tsx`
- `src/components/summary/SummaryDisplay.tsx`
- `src/components/chat/ChatPanel.tsx`
- `src/components/chat/Thread.tsx`
- `src/app/(app)/import/page.tsx`
- `src/components/import/ImportForm.tsx`
- `src/components/dashboard/SpendByCategoryChart.tsx`
- `src/components/dashboard/TopMerchantsTable.tsx`

---

## What actually happened

(fill in post-session)

## Deferred to next session

## Status

- [ ] In progress
- [ ] Complete
- [ ] Partial — see deferred
