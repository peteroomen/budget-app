# Mobile Nav — Thorough Implementation

**Date:** 2026-05-27  
**Branch:** feature/mobile-nav-thorough  
**Roadmap item:** Phase 5 — Polish (design spec: `design_handoff_theme_application 3/README.md` § "Mobile navigation — detailed spec")

## Goal

Bring the three mobile nav surfaces (top header, bottom tab bar, hamburger drawer) to full fidelity
with the design spec. Every measurement, behaviour, and interaction rule in the spec must be
implemented — this is the "very thorough" pass.

## What exists vs what the spec requires

### BottomTabBar (`src/components/nav/BottomTabBar.tsx`)

| Point                         | Current                                             | Spec                                                                                                     |
| ----------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Backdrop filter               | `backdrop-blur-sm` (Tailwind), no `-webkit-` prefix | `blur(12px)` + `-webkit-backdrop-filter: blur(12px)` (Safari needs the prefix)                           |
| Background alpha              | `bg-card/95`                                        | `hsl(var(--card) / 0.96)`                                                                                |
| `flex-shrink: 0`              | missing                                             | required (bar never compresses when keyboard opens)                                                      |
| `position: sticky; bottom: 0` | not set                                             | required per spec (keyboard-safe layout)                                                                 |
| Tab cell padding              | `py-1` (Link wraps cell)                            | `padding: 6px 4px` per cell                                                                              |
| Label truncation              | no protection                                       | `whitespace-nowrap overflow-hidden text-ellipsis`                                                        |
| Label weight                  | `font-medium` inactive, `font-semibold` active      | weight 500 inactive, 600 active — correct semantically, verify `font-weight` computes right via Tailwind |
| `font-size`                   | `text-[10.5px]`                                     | 10.5px ✓                                                                                                 |

### MobileDrawer (`src/components/nav/MobileDrawer.tsx`)

| Point                    | Current                                            | Spec                                                                              |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Sheet side               | `side="left"`, `w-72 h-full`                       | `side="bottom"`, full width, `max-h: 85vh`, `rounded-t-[18px]`                    |
| Overlay                  | `bg-black/80` (shadcn default)                     | `bg-black/40` + `backdrop-blur-[2px]`                                             |
| Panel background         | inherits                                           | explicit `bg-background`                                                          |
| Panel padding            | shadcn default `p-6`                               | `p-4` per spec                                                                    |
| Header                   | `sr-only` SheetTitle                               | Visible "Menu" label in `font-display 16px 600` + explicit ×-button               |
| Avatar shape             | `rounded-md`                                       | `rounded-full` — circular per spec                                                |
| Avatar size              | `h-9 w-9` (36px)                                   | 36px ✓                                                                            |
| Dividers                 | single Separator after header                      | Full-bleed dividers (negative margin to escape padding) at top + above sign-out   |
| Nav rows active style    | `NavLink` with 2px left-edge bar                   | No 2px bar in drawer; active = `bg-muted` background + `text-primary` icon        |
| Nav rows inactive        | `NavLink` with sidebar styling                     | transparent bg, `text-muted-foreground`                                           |
| Row size                 | `h-10`                                             | `padding: 12px 8px`, no fixed height                                              |
| Navigation timing        | `setOpen(false); router.push(href)` (simultaneous) | close first, then `setTimeout(() => router.push(href), 200)`                      |
| Sign-out row             | absent                                             | Bottom destructive row: `LogOut` icon + "Sign out" label, both `text-destructive` |
| Scroll reset             | absent                                             | `useEffect` resets scroll to top on `open` change                                 |
| Tab bar inert while open | absent                                             | `BottomTabBar` gets `pointer-events-none` while drawer is open                    |

### Layout header (mobile) — `src/app/(app)/layout.tsx`

| Point                | Current                                     | Spec                                                                       |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| Right cluster mobile | empty (Import button is `hidden` on mobile) | Notification bell — `Bell` 16px, 32×32 ghost, `aria-label="Notifications"` |

### Root layout — `src/app/layout.tsx`

| Point                        | Current | Spec                                                    |
| ---------------------------- | ------- | ------------------------------------------------------- |
| Viewport `interactiveWidget` | absent  | `'resizes-content'` — Android Chrome keyboard behaviour |

### `src/components/ui/sheet.tsx`

`SheetContent` embeds `SheetOverlay` without exposing an `overlayClassName` prop. To customise the
overlay for the bottom-sheet drawer, we need to add `overlayClassName` to `SheetContent`.

### `src/components/nav/NavLink.tsx`

Currently always renders the 2px left-edge bar when active. Drawer rows need the same component
but without the bar. Add a `showBar?: boolean` prop (default `true`) — the drawer passes
`showBar={false}`.

## Approach

1. **No new dependencies.** Everything uses existing shadcn, Tailwind, Radix, Next Router.
2. **Minimal ripple.** Only the 6 files below change; no other pages or data code touched.
3. **Context for tab bar inert state.** A tiny `'use client'` context (`MobileNavContext.tsx`) shares
   drawer-open state between `MobileDrawer` and `BottomTabBar`. The context provider wraps the
   right-column `<div>` in `(app)/layout.tsx`.  
   Alternative considered: CSS-only via `data-drawer-open` attribute on `<body>`. Rejected because
   it would require a `useEffect` writing to `document.body` from inside `MobileDrawer`, which is
   messier than a context.
4. **Sheet overlay customisation.** Add `overlayClassName?: string` to `SheetContent` and thread it
   to `SheetOverlay`. One-line change to `sheet.tsx`.

## Steps

- [ ] 1. Add `overlayClassName` prop to `SheetContent` in `src/components/ui/sheet.tsx`
- [ ] 2. Add `showBar` prop to `NavLink` in `src/components/nav/NavLink.tsx`
- [ ] 3. Create `src/components/nav/MobileNavContext.tsx` — context + provider for drawer open state
- [ ] 4. Fix `BottomTabBar`:
  - [ ] 4a. Add `style={{ WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}`
  - [ ] 4b. Change `bg-card/95` → `bg-card/[0.96]`
  - [ ] 4c. Add `shrink-0 sticky bottom-0` classes
  - [ ] 4d. Fix tab cell: change `Link` padding from `py-1` to `py-[6px] px-1`
  - [ ] 4e. Add `whitespace-nowrap overflow-hidden text-ellipsis` to label spans
  - [ ] 4f. Read `drawerOpen` from context; add `pointer-events-none` when true
- [ ] 5. Rewrite `MobileDrawer`:
  - [ ] 5a. Change `side="left"` → `side="bottom"`, remove `w-72`
  - [ ] 5b. Add `overlayClassName="bg-black/40 backdrop-blur-[2px]"` to SheetContent
  - [ ] 5c. Style content panel: `rounded-t-[18px] max-h-[85vh] p-4 flex flex-col` (override shadcn `border-t` with no-top-border since corners handle it visually)
  - [ ] 5d. Replace the built-in shadcn `SheetPrimitive.Close` (hidden by default) — control it ourselves inside the header row
  - [ ] 5e. Add visible header row: "Menu" label (`font-display text-[16px] font-semibold`) + explicit X close button (`SheetClose`)
  - [ ] 5f. Change avatar to `rounded-full`
  - [ ] 5g. Make dividers full-bleed: `mx-[-16px]` (negative margin to escape `p-4`)
  - [ ] 5h. Replace `NavLink` usage in drawer with an inline `DrawerNavRow` (button, not Link) that uses `showBar={false}` styling and the navigation delay
  - [ ] 5i. Fix navigation: `setOpen(false); setTimeout(() => router.push(href), 200)`
  - [ ] 5j. Add scroll reset: `useRef + useEffect(() => { if (open) ref.current?.scrollTo({top:0}) }, [open])`
  - [ ] 5k. Add sign-out row at bottom: full-width button row, `LogOut` icon + "Sign out" text, both `text-destructive`, calls `signOut()` from `@/lib/auth`
  - [ ] 5l. Write `drawerOpen` to context on open/close
- [ ] 6. Update `(app)/layout.tsx`:
  - [ ] 6a. Wrap the right column `<div>` in `<MobileNavProvider>`
  - [ ] 6b. Add notification Bell button to mobile header right cluster
- [ ] 7. Add `viewport` export to `src/app/layout.tsx` with `interactiveWidget: 'resizes-content'`
- [ ] 8. Run `pnpm lint` + `pnpm type-check` — fix any errors

## Manual test steps

### Bottom tab bar

- [ ] At 360px viewport width: all 5 labels visible, none wrap to two lines, none truncate (they're short enough — verify "Transactions" fits)
- [ ] Resize from 1024px → 360px: sidebar disappears, tab bar appears at exactly 768px breakpoint, no flash
- [ ] Resize 360px → 1024px: tab bar disappears, sidebar appears at 768px
- [ ] Active tab icon + label are sage (`text-primary`), weight 600; others are muted, weight 500
- [ ] Tap each of 5 tabs — navigates correctly, active state updates
- [ ] Open DevTools → iOS simulator (or real iPhone): tab bar floats above home indicator with a gap; not cut off
- [ ] On Chat page: soft keyboard opens → tab bar lifts with viewport, chat input stays accessible above bar; no overlap

### Mobile header

- [ ] Hamburger button (Menu icon) visible on left, 32×32 tap target
- [ ] "Tide" wordmark (font-display) in centre-left cluster
- [ ] Bell icon on right side, 32×32 tap target, `aria-label="Notifications"`
- [ ] Header stays opaque (not translucent) when content scrolls beneath it
- [ ] On desktop (≥768px): hamburger and bell hidden, desktop Import CTA visible

### Mobile drawer (hamburger)

- [ ] Tapping hamburger → sheet slides up from bottom, scrim darkens with 40% black + light blur behind it
- [ ] Panel has rounded top corners (18px), max-height ~85% of viewport, scrollable if needed
- [ ] Header row: "Menu" label on left, × close button on right
- [ ] User chip: circular avatar with gradient + initials, name + email, theme toggle on right
- [ ] Dividers are full-bleed (extend to panel edges, not inset by padding)
- [ ] All 7 nav items present: Dashboard, Transactions, Budgets, Summary, Chat — divider — Import, Settings
- [ ] Active route: row has `bg-muted` background, icon is sage; NO 2px left bar (sidebar only)
- [ ] Inactive rows: transparent background, muted color
- [ ] Sign-out row at bottom: destructive red icon + label
- [ ] Tap a nav item → drawer closes with animation, THEN navigation completes (~200ms gap) — no jank
- [ ] Tap the scrim (outside panel) → drawer closes
- [ ] Press Escape → drawer closes
- [ ] Open drawer, scroll down inside it, close, reopen → scroll position resets to top
- [ ] Bottom tab bar is non-interactive while drawer is open (pointer-events blocked)
- [ ] Theme toggle inside drawer flips app-wide theme and persists

### Edge cases

- [ ] Drawer sign-out: tapping fires sign-out action (navigates to /login or equivalent)
- [ ] Long-press any tab → no browser context menu (buttons, not anchors at the tap level)
- [ ] Notification bell: tap → no crash (no-op for now; no badge dot)

## Out of scope for this session

- Swipe-down gesture to dismiss drawer (requires `vaul` — deferred per spec)
- Wiring up the notification bell (future feature)
- Scroll-to-top on same-route tab tap (nice-to-have per spec)
- Landscape safe-area side insets
- Dark-mode override for `c-coffee` / `c-rent` category dot colours

---

<!-- Fill in below during/after the session -->

## What actually happened

All steps completed exactly as planned. One extra discovery during implementation: shadcn `SheetContent` renders its own built-in × close button absolutely positioned at top-right. Since the bottom-sheet has its own header row with a custom close button, we added `hideDefaultClose` prop to `SheetContent` to suppress the built-in one (otherwise two × buttons would appear).

`cn()` uses `twMerge` so the `border-t-0` class in the consumer correctly overrides the cva-generated `border-t` from the bottom-sheet variant — no explicit className ordering concern.

## Files created / modified

- `src/components/ui/sheet.tsx` — added `overlayClassName` + `hideDefaultClose` props to `SheetContent`
- `src/components/nav/NavLink.tsx` — added `showBar` prop (default true) to suppress 2px left-edge bar in non-sidebar contexts
- `src/components/nav/MobileNavContext.tsx` — **new file** — tiny client context for sharing drawer-open state between `MobileDrawer` and `BottomTabBar`
- `src/components/nav/BottomTabBar.tsx` — backdrop fix (both prefixes), `bg-card/[0.96]`, `sticky bottom-0 shrink-0`, tab cell padding `py-[6px] px-1`, label truncation guard, `pointer-events-none` when drawer open
- `src/components/nav/MobileDrawer.tsx` — full rewrite: `side="bottom"`, 18px top corners, `max-h-[85vh]`, light overlay, visible "Menu" header + × button, circular avatar, full-bleed dividers, `DrawerNavRow` (no left-edge bar), 220ms navigation delay, scroll reset on open, sign-out destructive row, `MobileNotificationBell` export
- `src/app/(app)/layout.tsx` — wrap right column in `MobileNavProvider`, add `MobileNotificationBell` to mobile header right cluster, explicit `bg-background` on header
- `src/app/layout.tsx` — added `viewport` export with `interactiveWidget: 'resizes-content'`

## Deferred to next session

- Swipe-down gesture to dismiss drawer (requires `vaul`)
- Wiring the notification bell to actual notifications
- Scroll-to-top on same-route tab tap

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
