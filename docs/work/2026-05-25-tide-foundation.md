# Tide Theme — Chunk 1: Foundation

**Date:** 2026-05-25  
**Branch:** feature/tide-foundation  
**Roadmap item:** Phase 5 — Polish (design handoff: Tide / Editorial theme application, Chunk 1 of 3)

## Goal

Replace the stock shadcn slate theme with the Tide/Editorial visual system: new CSS tokens, full light + dark themes with `next-themes`, three fonts (Fraunces + JetBrains Mono alongside existing Inter), brand rename to "Tide", and all shared primitive updates (Button, Badge, Progress, Tabs, Card, Input).

After this session every page should show the new palette and component shapes, and the theme toggle should work in the sidebar footer and mobile drawer.

## Approach

No data/logic changes — purely visual. All changes are in `globals.css`, `tailwind.config.ts`, `layout.tsx`, shadcn primitives, and the app shell layout.

**Dependency added:** `next-themes` (not currently in package.json). Must wire `ThemeProvider` around `<body>` and add `suppressHydrationWarning` on `<html>` to prevent the SSR mismatch.

**Branching from:** `main` (nav/layout restructure already merged).

**Worktree:** `../budget-app-tide-foundation`

## Steps

### 1. Install next-themes

- [ ] `pnpm add next-themes` in the worktree

### 2. CSS tokens — replace globals.css `@layer base`

- [ ] Replace both `:root` and `.dark` blocks with Tide/Editorial values from the handoff
- [ ] Add `--success` and `--warning` semantic tokens (used in budgets/transactions)
- [ ] Add `font-feature-settings: "cv11", "ss01", "ss03"` on `body` in `@layer base`

### 3. Font setup

- [ ] Add Fraunces + JetBrains Mono imports via `next/font/google` in `src/app/layout.tsx`
- [ ] Expose as `--font-display` and `--font-mono` CSS variables on `<html>`
- [ ] Add `suppressHydrationWarning` to `<html>` (required for next-themes)
- [ ] Extend `tailwind.config.ts` with `fontFamily: { display, mono }` + `fontFeatureSettings`

### 4. ThemeProvider + ThemeToggle

- [ ] Create `src/components/theme/ThemeProvider.tsx` — thin wrapper around `next-themes` `ThemeProvider` (needs `"use client"`)
- [ ] Wrap `<body>` in `ThemeProvider` in `src/app/layout.tsx` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`)
- [ ] Create `src/components/theme/ThemeToggle.tsx` — `Sun` / `Moon` icon button, 28×28 ghost, toggles between `light` and `dark` (leaves system alone once explicitly set)
- [ ] Slot `ThemeToggle` into `SidebarNav` footer row alongside existing `SignOutButton`
- [ ] Slot `ThemeToggle` into the mobile `Sheet` drawer's user-chip row

### 5. Brand rename

- [ ] `src/app/layout.tsx` — update `<title>` and metadata to "Tide"
- [ ] `src/app/(app)/layout.tsx` — update sidebar brand label and mobile header text from "Budget App" to "Tide"
- [ ] Grep for any remaining "Budget App" user-facing strings and replace

### 6. Primitives

#### Button (`src/components/ui/button.tsx`)

- [ ] Default size: `h-9 px-3.5 text-[13px]` (was `h-10 px-4`)
- [ ] `sm` variant: `h-7 px-2.5 text-[12px]`
- [ ] Add `icon-sm` size: `h-7 w-7` (28×28, for sidebar footer and MonthSelector chevrons)
- [ ] Primary hover: `hover:bg-primary/90`

#### Card (`src/components/ui/card.tsx`)

- [ ] `CardHeader`: `p-5 pb-2`
- [ ] `CardContent`: `px-5 pb-5 pt-2`
- [ ] `CardTitle`: add `font-display font-semibold text-[14px] tracking-[-0.005em]`
- [ ] `CardDescription`: `text-[12px] text-muted-foreground`

#### Badge (`src/components/ui/badge.tsx`)

- [ ] Add variants: `accent` (`bg-primary/10 text-primary`), `warn` (`bg-warning/14 text-warning`), `danger` (`bg-destructive/12 text-destructive`), `outline` (`border border-border bg-transparent text-muted-foreground`)
- [ ] Adjust sizing: `h-5 px-2 text-[11px] font-medium rounded-full`

#### Progress (`src/components/ui/progress.tsx`)

- [ ] Default height: `h-1.5` (6px)
- [ ] Add `indicatorClassName` prop for per-category colour overrides
- [ ] Add smooth transition on indicator: `transition: width 0.4s cubic-bezier(.2,.7,.2,1)`

#### Tabs (`src/components/ui/tabs.tsx`)

- [ ] Restyle `TabsList`: `inline-flex p-1 h-9 rounded-md bg-muted border border-border`
- [ ] Active `TabsTrigger`: `bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]`
- [ ] Inactive: `bg-transparent text-muted-foreground`
- [ ] Trigger sizing: `h-7 px-3 text-[13px] font-medium rounded-[6px]`

#### Input (`src/components/ui/input.tsx`)

- [ ] Height `h-9`, font-size `text-[13px]`
- [ ] Focus: `border-primary ring-2 ring-primary/16`

## Manual test steps

- [ ] `pnpm dev` starts without errors in the worktree
- [ ] Page background is warm paper (`#fbf8f3`), not white — verify in light mode
- [ ] Dark mode: toggle via the sidebar footer button, page goes to near-black `#1a1715`
- [ ] Theme persists across page reload (localStorage via next-themes)
- [ ] First load with no localStorage reads system preference (`prefers-color-scheme`)
- [ ] No flash of wrong theme on reload (test in incognito / cleared storage)
- [ ] Sidebar brand label reads "Tide", browser tab title reads "Tide"
- [ ] Fraunces loads — check any `font-display` class renders a serif font
- [ ] Primary buttons are sage green with white text (light) / dark text (dark)
- [ ] Badge variants render: accent (sage wash), warn (gold), danger (rust), outline (bordered)
- [ ] Progress bar default is 6px tall
- [ ] Tabs on `/settings` render as a segmented control (pill background on active tab)
- [ ] No "Budget App" strings visible anywhere in the UI
- [ ] `pnpm lint` passes, `pnpm type-check` passes

## Out of scope for this session

- Per-page visual passes (Chunk 2 and 3)
- Dashboard/Transactions/Budgets/Summary/Chat/Import per-page typography and spacing
- Chart colour cycling (covered in Chunk 3 polish pass)
- Empty state illustration updates
- Loading skeleton visual updates

---

## What actually happened

All steps completed as planned. Badge component didn't exist in the codebase at all — created from scratch.
Avatar gradient (primary → primary/60) applied to both sidebar footer and mobile drawer user chip.
Prettier normalised quote style in globals.css (double → single) during pre-commit hook — fine.
`--font-inter` variable renamed to `--font-sans` to match the fontFamily extension in tailwind.config.ts.

## Files created / modified

- `src/app/globals.css` — full token replacement (light + dark), font-feature-settings on body
- `src/app/layout.tsx` — Fraunces + JetBrains Mono fonts, ThemeProvider wrapper, metadata → "Tide", suppressHydrationWarning
- `src/app/(app)/layout.tsx` — brand "Tide", ThemeToggle in sidebar footer, sage gradient avatar
- `src/app/(auth)/login/page.tsx` — "Tide" on login card title
- `src/app/page.tsx` — "Tide" on homepage h1
- `tailwind.config.ts` — fontFamily (sans/display/mono), success/warning colour tokens
- `src/components/theme/ThemeProvider.tsx` — new: thin next-themes wrapper
- `src/components/theme/ThemeToggle.tsx` — new: Sun/Moon icon button
- `src/components/nav/MobileDrawer.tsx` — ThemeToggle in user chip row, sage gradient avatar
- `src/components/ui/badge.tsx` — new: Badge with accent/warn/danger/outline variants
- `src/components/ui/button.tsx` — density (h-9/h-7), icon-sm size
- `src/components/ui/card.tsx` — tighter padding, CardTitle → font-display
- `src/components/ui/input.tsx` — h-9, 13px, sage focus ring
- `src/components/ui/progress.tsx` — h-1.5, smooth cubic-bezier transition
- `src/components/ui/tabs.tsx` — segmented control styling
- `package.json` + `pnpm-lock.yaml` — next-themes added

## Deferred to next session

Chunk 2: per-page visual passes for Dashboard, Transactions, Budgets (data pages).

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
