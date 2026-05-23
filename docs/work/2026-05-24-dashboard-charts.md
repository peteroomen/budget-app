# Dashboard Charts

**Date:** 2026-05-24  
**Branch:** feature/dashboard-charts  
**Roadmap item:** Phase 3 — Dashboard & Budgets (build order item #10)

## Goal

Replace the dashboard stub with a working monthly dashboard: spend by category chart, income vs spend summary cards, top 5 merchants list, and a month selector for navigating history.

## Approach

Single server page at `/dashboard` — reads `?month=YYYY-MM` search param (defaults to current month), fetches all transactions for that month via one Supabase query, computes aggregations in the server action, and passes typed data to presentational components.

**Sign convention:** `amount_cents < 0` = expense (money out), `amount_cents > 0` = income. "Total spend" = sum of |amount_cents| for negative rows. "Total income" = sum of amount_cents for positive rows.

**shadcn chart install:** `pnpm dlx shadcn@latest add chart` — pulls in recharts and the shadcn chart primitives.

**Charts:** Use shadcn `ChartContainer` + Recharts `BarChart` for spend by category. Donut is also an option but bar makes relative sizes clearer for 18 categories.

**Component split:**

- `src/lib/queries/dashboard.ts` — server-side data fetching + aggregation
- `src/components/dashboard/MonthSelector.tsx` — client component, prev/next month buttons using `useRouter`
- `src/components/dashboard/IncomeVsSpendCards.tsx` — three shadcn Cards: Total Income, Total Spend, Net
- `src/components/dashboard/SpendByCategoryChart.tsx` — shadcn ChartContainer + Recharts BarChart
- `src/components/dashboard/TopMerchantsTable.tsx` — shadcn Card + simple list of top 5 merchants
- `src/app/(app)/dashboard/page.tsx` — server page, orchestrates all the above

**No new DB columns or migrations needed** — all data comes from existing `transactions` + `categories` + `accounts`.

## Steps

- [x] Write plan file
- [x] `pnpm dlx shadcn@latest add chart` — install chart component
- [x] `src/lib/queries/dashboard.ts` — `getDashboardData(householdId, month)` and supporting types
- [x] `src/components/dashboard/MonthSelector.tsx` — client component with prev/next navigation
- [x] `src/components/dashboard/IncomeVsSpendCards.tsx` — income / spend / net summary cards
- [x] `src/components/dashboard/SpendByCategoryChart.tsx` — bar chart, spend by category
- [x] `src/components/dashboard/TopMerchantsTable.tsx` — top 5 merchants by spend
- [x] `src/app/(app)/dashboard/page.tsx` — replace stub, wire up all components
- [x] `pnpm lint` + `pnpm type-check`
- [ ] Commit + push + open PR

## Manual test steps

Happy path:

- [ ] Navigate to `/dashboard` — confirm page loads with current month shown in selector
- [ ] Month selector: click "Previous" — confirm URL updates to prior month and page re-renders
- [ ] Month selector: click "Next" — confirm URL updates forward and disables when at current month
- [ ] With transactions imported for the current month: confirm IncomeVsSpendCards show correct totals (cross-check against transaction list)
- [ ] Confirm SpendByCategoryChart renders bars for each category with spend > 0
- [ ] Confirm TopMerchantsTable shows up to 5 merchants ordered by total spend descending
- [ ] Hover over a chart bar — confirm recharts tooltip shows category name + NZD amount

Edge cases:

- [ ] Empty state (no transactions for selected month): cards show $0.00, chart shows empty state message, merchants list is empty
- [ ] Transactions with no category (category_id is null): grouped under "Uncategorised" in chart
- [ ] Income-only month (all positive amounts): Total Spend = $0.00, Net = Total Income

## Out of scope for this session

- Budget vs actual overlay on chart (Phase 3 — item #11)
- Recurring transactions / fixed costs card (Phase 3 — item #12)
- Over-budget callout cards (depends on budgets item #11)
- Pagination or infinite history

---

<!-- Fill in below during/after the session -->

## What actually happened

- Pure date utilities (`prevMonth`, `nextMonth`, `currentMonth`, `formatMonthLabel`, `monthDateRange`) extracted to `src/lib/utils/month.ts` — necessary because `MonthSelector` is a client component and cannot import from `src/lib/queries/dashboard.ts` (which pulls in `@/lib/supabase/server` → `next/headers`, server-only).
- `SpendByCategoryChart` uses a horizontal `BarChart` (layout="vertical") which is more readable for categories with longer names than a vertical bar chart.
- Each bar uses the category's stored `color` field from the DB; falls back to a preset palette for uncategorised or uncoloured categories.
- `ChartTooltipContent` formatter renders NZD currency on hover.
- `IncomeVsSpendCards` net sign: shows "−" prefix manually when negative rather than relying on `Intl.NumberFormat` (which uses accounting notation parentheses in some locales).
- Prettier auto-applied `as unknown as` to the Supabase query result cast in `dashboard.ts` — correct behaviour, left as-is.
- lint and type-check pass clean with zero warnings.

## Files created / modified

- `src/lib/utils/month.ts` — new: pure date helpers (prevMonth, nextMonth, currentMonth, formatMonthLabel, monthDateRange)
- `src/lib/queries/dashboard.ts` — new: getDashboardData() server query + aggregation types
- `src/components/ui/chart.tsx` — added (shadcn chart, installed via pnpm dlx)
- `src/components/ui/card.tsx` — updated (shadcn chart install overwrote with latest version)
- `src/components/dashboard/MonthSelector.tsx` — new: client component, prev/next month navigation
- `src/components/dashboard/IncomeVsSpendCards.tsx` — new: income / spend / net summary cards
- `src/components/dashboard/SpendByCategoryChart.tsx` — new: horizontal bar chart, spend by category
- `src/components/dashboard/TopMerchantsTable.tsx` — new: top 5 merchants by spend
- `src/app/(app)/dashboard/page.tsx` — replaced stub with full server page
- `package.json` + `pnpm-lock.yaml` — recharts@2.15.4 added via shadcn chart install

## Deferred to next session

- Budget vs actual overlay on chart (requires item #11 — Budget management)
- Over-budget callout cards (requires item #11)
- Recurring transactions / fixed costs card (item #12)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
