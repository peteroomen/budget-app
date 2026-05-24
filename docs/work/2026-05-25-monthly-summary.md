# Monthly Summary

**Date:** 2026-05-25  
**Branch:** feature/monthly-summary  
**Roadmap item:** Phase 5 — Monthly summary (build order item #15)

## Goal

A `/summary` page with a month selector that calls Claude once per page load (`generateText`) and renders a nicely formatted one-page recap: overall spend vs budget, vs prior month, top over-budget categories, biggest merchant, and notable patterns.

## Approach

This is a pure server page — no streaming, no chat. On each page load:

1. Fetch current month's transactions (reuse `getDashboardData` + `getBudgetsWithActuals`)
2. Fetch prior month's dashboard data for comparison (same functions)
3. Format everything into a structured text prompt for Claude
4. Call `generateText` with the Anthropic provider — returns a JSON string
5. Parse the JSON and render each section as a styled shadcn Card

**Why JSON from `generateText` rather than `generateObject`?** The task spec says `generateText`. I'll ask Claude to return JSON in a specific schema and wrap the parse in try/catch, falling back to a raw text display if parsing fails.

**Summary schema Claude must return:**

```json
{
  "headline": "One-sentence overall take on the month",
  "spendNote": "Paragraph on total spend vs budget and vs prior month",
  "overBudgetCategories": [{ "category": "Dining Out", "note": "Went 40% over budget..." }],
  "biggestMerchantNote": "Countdown was your biggest merchant at $X...",
  "vsLastMonthNote": "Spending is up $X (+Y%) vs October...",
  "notablePatterns": ["Pattern 1", "Pattern 2"]
}
```

**Component split:**

- `src/lib/queries/summary.ts` — `getSummaryContext(month)` — fetches current + prior month data, returns a typed `SummaryContext` object
- `src/app/(app)/summary/page.tsx` — server page: reads `?month`, calls `getSummaryContext`, calls `generateText`, parses result, renders
- `src/components/summary/SummaryDisplay.tsx` — presentational component, renders the parsed summary as cards
- `src/components/summary/MonthSelector.tsx` — reuse same pattern as dashboard `MonthSelector`
- `src/app/(app)/layout.tsx` — add "Summary" nav link

**No new DB migrations needed.**

## Steps

- [x] Write plan file
- [x] `src/lib/queries/summary.ts` — `getSummaryContext()` + types
- [x] `src/components/summary/SummaryMonthSelector.tsx` — client component (same pattern as dashboard)
- [x] `src/components/summary/SummaryDisplay.tsx` — presentational, renders summary JSON as cards
- [x] `src/app/(app)/summary/page.tsx` — server page: fetches context, calls Claude, renders
- [x] `src/app/(app)/summary/loading.tsx` — skeleton loading state
- [x] `src/components/ui/skeleton.tsx` — added via `pnpm dlx shadcn@latest add skeleton`
- [x] `src/app/(app)/layout.tsx` — add Summary to NAV_ITEMS
- [x] `pnpm lint` + `pnpm type-check`
- [ ] Commit + push + open PR

## Manual test steps

Happy path:

- [ ] Navigate to `/summary` — confirm page loads (may take a few seconds for Claude call)
- [ ] Confirm month selector shows current month; prior month selector works
- [ ] With transactions + budgets for the selected month: confirm all cards render with real data
- [ ] Confirm "vs last month" section shows when prior month has transactions
- [ ] Confirm "over-budget categories" lists categories where actual > budget

Edge cases:

- [ ] Month with no transactions: confirm graceful empty state (skip Claude call, show message)
- [ ] Month with transactions but no budgets set: over-budget section should be absent
- [ ] Month with no prior month data: "vs last month" section absent or shows "no prior month data"

## Out of scope for this session

- Recurring detection (item #12) — `is_recurring` column exists but logic not built
- Chat context injection (item #14) — chat still uses stub system prompt
- In-app budget alerts, multi-account view, search, export (other Phase 5 items)
- Caching the Claude response (not needed for a 2-person app)

---

<!-- Fill in below during/after the session -->

## What actually happened

- `getSummaryContext` reuses the same Supabase query pattern as `getDashboardData` but additionally fetches budget amounts for the month and prior-month transactions for comparison.
- `buildSummaryPrompt` formats the context as human-readable text with NZD amounts and returns it with an explicit JSON schema instruction. Claude is asked to return bare JSON (no markdown fences) to simplify parsing.
- The page splits into two async server components: `SummaryPage` (fetches context, renders month selector + empty state) and `SummaryContent` (calls `generateText`, parses JSON, hands off to `SummaryDisplay`). This ensures the month selector renders immediately while the Claude call loads.
- `loading.tsx` provides a skeleton layout using the shadcn `Skeleton` component, installed via `pnpm dlx shadcn@latest add skeleton`.
- Removed `month` prop from `SummaryContent` (unused — `ctx.month` has it) to satisfy the `@typescript-eslint/no-unused-vars` lint rule.
- Lint and type-check both pass clean.

## Files created / modified

- `src/lib/queries/summary.ts` — new: `getSummaryContext()`, `buildSummaryPrompt()`, related types
- `src/components/summary/SummaryMonthSelector.tsx` — new: client component for month navigation
- `src/components/summary/SummaryDisplay.tsx` — new: renders parsed summary JSON as cards
- `src/components/ui/skeleton.tsx` — new: added via shadcn
- `src/app/(app)/summary/page.tsx` — new: server page, calls `generateText`, renders summary
- `src/app/(app)/summary/loading.tsx` — new: skeleton loading state
- `src/app/(app)/layout.tsx` — added "Summary" to NAV_ITEMS
- `docs/work/2026-05-25-monthly-summary.md` — this plan file

## Deferred to next session

- Chat context injection (item #14) — chat still uses stub system prompt with no real data
- Recurring detection (item #12)
- Caching the Claude response (not needed for a 2-person app, but could add React cache() if latency becomes a concern)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
