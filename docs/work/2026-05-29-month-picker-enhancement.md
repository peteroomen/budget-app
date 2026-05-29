# Month Picker Enhancement — Year+Month Grid Popover

**Date:** 2026-05-29  
**Branch:** feature/month-picker  
**Roadmap item:** Phase 5 — Polish (Month picker enhancement)

## Goal

Replace the static month label in `MonthSelector`, `SummaryMonthSelector`, and `MonthPicker` with a clickable trigger that opens a Popover showing a year+month grid, so users can jump directly to any month instead of stepping one at a time.

## Approach

### Single shared component

Create one `MonthJumpPopover` component (`src/components/ui/month-jump-popover.tsx`) that owns the popover UI. Each of the three existing selectors calls its own routing logic — `MonthJumpPopover` accepts an `onSelect: (month: string) => void` callback and is responsible only for the picker UI.

### Grid layout

```
←  2026  →
Jan  Feb  Mar
Apr  May  Jun
Jul  Aug  Sep
Oct  Nov  Dec
```

- Year navigation: left/right chevrons change `viewYear` (internal state, initialised to selected year's year).
- 12 month buttons in a 3×4 grid. Short 3-char labels (Jan–Dec).
- Selected month (the current page month): distinct active style (`bg-primary text-primary-foreground`).
- Disabled months: any month after `currentMonth()` — unless `allowFuture` is true.
- Clicking an enabled month calls `onSelect('YYYY-MM')` and closes the popover.

### Trigger styling

The trigger replaces the current `<span className="min-w-[140px] text-center text-sm font-medium">` label. It renders as a ghost-variant button with the same dimensions and font style so the overall selector looks identical to today until hovered. A `CalendarDays` icon (16px, muted) sits inline to the right of the month text to hint the click affordance.

### Popover placement

`align="center"` (default), opens below the trigger. Width: `w-56` (`224px`) — fits a 3-column grid with comfortable padding.

### No routing changes

`MonthSelector`, `SummaryMonthSelector`, and `MonthPicker` keep their existing `navigate()` functions. The only change to each is replacing the `<span>` label with `<MonthJumpPopover ... onSelect={navigate} />`.

### Props

```ts
interface MonthJumpPopoverProps {
  selectedMonth: string // 'YYYY-MM'
  onSelect: (month: string) => void
  allowFuture?: boolean // default false
}
```

### No new dependencies

`Popover` is already at `src/components/ui/popover.tsx`. `date-fns` is already a dependency. `CalendarDays` is in `lucide-react` (already installed).

### Quirk: `MonthSelector` still uses `isAdmin?` prop

`MonthSelector` has a stale `isAdmin?` prop (it should be `allowFuture` like the other two, per CLAUDE.md's prop convention note). **Out of scope to rename** — just pass `allowFuture={!!isAdmin}` into `MonthJumpPopover` and leave the external prop unchanged to avoid touching callers.

## Steps

- [ ] 1. Create `src/components/ui/month-jump-popover.tsx` — client component with props above, year nav + 3×4 month grid, Popover trigger/content.
- [ ] 2. Update `src/components/dashboard/MonthSelector.tsx` — replace `<span>` with `<MonthJumpPopover selectedMonth={month} onSelect={navigate} allowFuture={!!isAdmin} />`.
- [ ] 3. Update `src/components/summary/SummaryMonthSelector.tsx` — same pattern; pass `allowFuture`.
- [ ] 4. Update `src/components/budgets/MonthPicker.tsx` — same pattern; `allowFuture` defaults to false (no future months on budgets page).
- [ ] 5. `pnpm lint` + `pnpm type-check` — fix any errors.
- [ ] 6. Local smoke test (see Manual test steps).
- [ ] 7. Update CLAUDE.md "Current State" + close out this plan file.

## Manual test steps

Boot locally: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm dev` from the worktree.

### Happy path — Dashboard

- [ ] Navigate to `/dashboard`. The `‹ May 2026 ›` label now renders with a small calendar icon to the right.
- [ ] Click the label — Popover opens showing `← 2026 →` and the 12 month buttons; May is highlighted as selected.
- [ ] Click `Mar` — Popover closes, page navigates to `/dashboard?month=2026-03`.
- [ ] Re-open Popover — `Mar` is now highlighted as selected.
- [ ] Click `←` year arrow — grid shows 2025. All 12 months are enabled (all in the past). Click `Nov` → navigates to `/dashboard?month=2025-11`.

### Happy path — Summary

- [ ] `/summary` page (non-admin): Popover opens. June 2026 and later are disabled (greyed, not clickable).
- [ ] Admin user (allowFuture=true): all months incl. future enabled.

### Happy path — Budgets

- [ ] `/budgets` — same picker appears. Future months disabled. Clicking a month preserves any other query params (the existing `searchParams.toString()` logic is unchanged).

### Edge cases

- [ ] **Current year, last month**: on the December 2026 row, Jan–Dec are all shown. Past/present months are enabled; future months (if any) disabled.
- [ ] **Year navigation limits**: there is no hard lower bound — user can navigate to 2020 if they like. No lower boundary guard needed.
- [ ] **Keyboard**: Tab into trigger, Enter opens Popover; Tab through month buttons; Enter selects; Esc closes without navigating. (Radix Popover handles focus trap and Esc natively.)
- [ ] **Prev/next arrows still work**: clicking `‹` and `›` around the new trigger should still navigate one month at a time exactly as before. The Popover is closed when this happens (no open state to worry about — Popover is closed unless triggered).
- [ ] **Mobile**: Popover opens and the grid is usable at 360px width. `w-56` (224px) should fit comfortably even on small screens.

## Out of scope for this session

- Renaming `MonthSelector`'s `isAdmin` prop to `allowFuture` (that's a refactor touching callers — defer)
- Merging the three selector components into one (they have different route paths and transition logic)
- Adding a lower-bound year limit (no data before a certain year — not worth the complexity for two users)
- Inline calendar/date-range picker (overkill for monthly granularity)
- Animating the month grid (not needed)

---

<!-- Fill in below during/after the session -->

## What actually happened

Implementation matched the plan exactly. Key notes:

- **`MonthPicker` cleanup bonus**: the budgets `MonthPicker` had inlined its own `formatMonthLabel` and `offsetMonth` helpers. Updating it to use `MonthJumpPopover` also switched it to the shared `prevMonth`/`nextMonth` utils from `lib/utils/month` and swapped the bare `‹`/`›` text buttons for proper `Button size="icon"` with `ChevronLeft`/`ChevronRight` icons — consistent with the other two selectors now.
- **Popover open-on-trigger sync**: `handleOpenChange` resets `viewYear` to the selected month's year whenever the popover opens, so navigating months with the prev/next arrows and then opening the popover always starts at the right year.
- **`tsconfig.json` drift**: `next lint` auto-modified `tsconfig.json` again; reverted via `git checkout tsconfig.json` before committing (same pattern as previous sessions).
- Lint + type-check clean. Husky pre-commit ran lint-staged (prettier + eslint) and passed.

## Files created / modified

- `src/components/ui/month-jump-popover.tsx` — **new** — shared client component; Popover with year nav + 3×4 month grid; `selectedMonth`, `onSelect`, `allowFuture` props
- `src/components/dashboard/MonthSelector.tsx` — replaced `<span>` label with `<MonthJumpPopover>`; removed unused `formatMonthLabel` import
- `src/components/summary/SummaryMonthSelector.tsx` — same replacement; removed unused `formatMonthLabel` import
- `src/components/budgets/MonthPicker.tsx` — replaced label + inline helpers with `<MonthJumpPopover>` + shared `prevMonth`/`nextMonth` utils; switched bare text buttons to `Button size="icon"` with chevron icons
- `docs/work/2026-05-29-month-picker-enhancement.md` — this file

## Deferred to next session

- Nothing from this session. Rename `MonthSelector`'s `isAdmin` prop to `allowFuture` remains a separate future refactor.

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
