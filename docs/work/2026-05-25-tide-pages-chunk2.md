# Tide Theme — Chunk 2: Data Pages

**Date:** 2026-05-25  
**Branch:** feature/tide-pages (branched off feature/tide-foundation)  
**Roadmap item:** Phase 5 — Polish (design handoff: Tide / Editorial theme application, Chunk 2 of 3)

## Goal

Per-page visual passes for Dashboard, Transactions, and Budgets. All three pages adopt the Tide/Editorial typography, sage accent usage, and design-spec layout. No data/logic changes.

## Approach

Work in `../budget-app-tide-pages` worktree. Foundation tokens + primitives are already in place from Chunk 1. Changes are purely in page files and their component children.

**Key design decisions per page:**

- **Dashboard:** Fraunces hero metrics on KPI cards, `text-success` for income/positive-net, `text-foreground` for spend (not red — it's informational, not alarming), H1 in `font-display`
- **Transactions:** table header in `uppercase text-[11px] tracking-wider`, amounts in `font-mono text-[13px]` with `text-success` on income and `text-foreground` on expenses (spec deliberately de-emphasises spend — not destructive red); day-list headers in `font-display`
- **Budgets:** convert table layout to 2-col card grid with `Badge` pacing indicators; `BudgetProgressBar` uses semantic tokens (`bg-primary` / `bg-warning` / `bg-destructive`) instead of hardcoded Tailwind colors

## Steps

### Dashboard

- [ ] `page.tsx`: H1 → `font-display text-[28px] font-medium leading-[1.15] tracking-[-0.018em]`; add subtitle "Where the money went this month" in `text-[13px] text-muted-foreground`
- [ ] `IncomeVsSpendCards.tsx`: hero metric `p` → `font-display text-[26px] font-medium tabular-nums`; income → `text-success`; spend → `text-foreground`; net → `text-success` if positive, `text-foreground` if negative; `CardTitle` override to `text-[12px] text-muted-foreground font-sans font-medium` (overrides the Fraunces default for these label-style titles)
- [ ] `FixedCostsCard.tsx`: read + apply same hero metric treatment; CardTitle override
- [ ] `SpendByCategoryChart.tsx`: read + verify chart colours use `chart-1..5` tokens (already done via token replacement; just verify no hardcoded hex)
- [ ] `TopMerchantsTable.tsx`: read + apply `font-mono tabular-nums` to amount column

### Transactions

- [ ] `page.tsx`: H1 → `font-display text-[28px] font-medium leading-[1.15] tracking-[-0.018em]`
- [ ] `TransactionTable.tsx`:
  - Header: `text-[11px] uppercase tracking-wider text-muted-foreground`
  - Body rows: `h-12 hover:bg-muted/40`
  - Amount cell: `font-mono text-[13px] tabular-nums`; `text-success` + `+` prefix for positive; `text-foreground` for negative (remove `text-destructive`)
- [ ] `TransactionDayList.tsx`: day-header label → `font-display text-[13px] font-semibold`; day total → `font-mono text-[11px] text-muted-foreground`; row amount → `font-mono text-[13px] tabular-nums`; income `text-success`

### Budgets

- [ ] `BudgetProgressBar.tsx`: replace `bg-emerald-500` → `bg-primary`, `bg-amber-500` → `bg-warning`, keep `bg-destructive`; add `Badge` pacing indicator (`accent` <80%, `warn` 80–100%, `danger` ≥100%); export a `getPacingVariant` helper
- [ ] `page.tsx`: H1 → `font-display`; convert table to 2-col `grid-cols-1 md:grid-cols-2 gap-4` card grid; each card uses `Card` with category dot + name + pacing Badge, Fraunces `$actual of $budget` metric, `Progress` with category color via `indicatorClassName`, bottom pacing text
- [ ] `OverBudgetCards.tsx`: already has `border-destructive/30 bg-destructive/5` — just verify it renders correctly with new tokens

## Manual test steps

- [ ] Dashboard H1 renders in Fraunces serif
- [ ] KPI cards show Fraunces 26px hero metrics
- [ ] Income amounts are sage green (`text-success`), spend is neutral foreground
- [ ] Transaction table header is uppercase/small-caps style
- [ ] Amounts in transaction table/day-list use monospace font
- [ ] Income transactions show `+` prefix in sage green
- [ ] Expense transactions are neutral foreground (no red on normal expenses)
- [ ] Budget cards render in 2-col grid (desktop), 1-col (mobile)
- [ ] On-track budget has sage `accent` badge, approaching has gold `warn`, over has rust `danger`
- [ ] Progress bars: sage (on track), gold (approaching), rust (over)
- [ ] Light and dark mode both look correct on all 3 pages

## Out of scope

- Summary, Chat, Import, Settings — Chunk 3
- Polish pass (chart colour cycling, empty state updates, skeleton updates) — Chunk 3

---

## What actually happened

All steps completed. BudgetProgressBar was simplified — `indicatorColor` prop approach dropped since CSS variable hex strings can't be expressed as Tailwind classes. Used semantic tokens (primary/warning/destructive) for pacing instead, which is exactly what the design spec calls for. PacingBadge, getPacingLabel, getPacingVariant extracted as named exports from BudgetProgressBar so BudgetCard can reuse them. Budget page table → card grid conversion went cleanly.

## Files created / modified

- `src/app/(app)/dashboard/page.tsx` — Fraunces H1 + subtitle
- `src/components/dashboard/IncomeVsSpendCards.tsx` — Fraunces 26px metrics, text-success, font-sans CardTitle override
- `src/components/dashboard/FixedCostsCard.tsx` — Fraunces 26px metric, font-sans CardTitle override
- `src/components/dashboard/TopMerchantsTable.tsx` — font-mono amounts, removed text-red-600
- `src/components/dashboard/SpendByCategoryChart.tsx` — FALLBACK_COLORS updated to chart-1..5 hex values
- `src/app/(app)/transactions/page.tsx` — Fraunces H1
- `src/components/transactions/TransactionTable.tsx` — uppercase headers, h-12 rows, font-mono amounts, text-success on income
- `src/components/transactions/TransactionDayList.tsx` — font-display day headers, font-mono amounts/totals, text-success on income
- `src/app/(app)/budgets/page.tsx` — Fraunces H1 + subtitle, table → card grid, removed unused imports
- `src/components/budgets/BudgetCard.tsx` — new component: category dot, name, PacingBadge, Fraunces metric, Progress, edit button
- `src/components/budgets/BudgetProgressBar.tsx` — semantic tokens, PacingBadge/getPacingLabel/getPacingVariant exports

## Deferred to next session

Chunk 3: Summary, Chat, Import, Settings verify, polish pass.

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
