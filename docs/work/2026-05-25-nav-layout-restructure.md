# Nav & Layout Restructure

**Date:** 2026-05-25  
**Branch:** feature/nav-layout-restructure  
**Roadmap item:** Phase 5 — Polish (design handoff: Nav & Layout)

## Goal

Replace the current flat 8-item sidebar with a structured primary/secondary sidebar (desktop) + bottom tab bar (mobile), consolidate Accounts/Categories/Admin into a `/settings` page, and add a day-grouped mobile transaction view. No schema changes. No page content changes.

## Approach

### Information architecture change

```
Before: Dashboard, Transactions, Import, Accounts, Categories, Budgets, Chat, Summary, (Admin)

After:
  Primary:   Dashboard, Transactions, Budgets, Summary, Chat
  Secondary: Import, Settings  (/settings consolidates Accounts + Categories + Admin)
```

### Settings page — component extraction (key technical decision)

The existing page components (`AdminPage`, `AccountsPage`, `CategoriesPage`) each do their own data-fetching and auth logic. We cannot import them wholesale into a tabbed page — `AdminPage` in particular has a `redirect()` call that would fire at render time regardless of which tab is active.

**Approach:** extract inner content into dedicated server components that accept pre-fetched data as props. Settings page does one top-level auth check + all data fetching, then renders the right content components:

```
src/components/settings/
  AccountsContent.tsx   ← extracted from accounts/page.tsx
  CategoriesContent.tsx ← extracted from categories/page.tsx
  DangerZoneContent.tsx ← extracted from admin/page.tsx
```

The old route files (`/accounts/page.tsx`, `/categories/page.tsx`, `/admin/page.tsx`) become thin `redirect()` wrappers.

### Layout structure (mobile + desktop)

```
<div class="flex h-dvh">           ← dvh for iOS Safari address bar
  <Sidebar />                      ← hidden on mobile (md:flex)
  <div class="flex flex-col flex-1 min-h-0">
    <Header />                     ← h-14, shrink-0
    <main class="flex-1 overflow-y-auto p-6">
      {children}
    </main>
    <BottomTabBar />               ← md:hidden, sticky bottom
  </div>
</div>
```

This places the bottom tab bar _outside_ the scroll container, so the chat page's `h-full` layout works correctly without overlap.

### Decisions made during planning (from review session)

- **No search input placeholder** — non-functional UI is worse than none; roadmap for later
- **No notification bell** — same reason
- **No theme toggle** — dark mode needs full implementation first; out of scope here
- **Hamburger icon:** `Menu` (not `List` as the design spec said)
- **Footer chip:** shows logged-in user's initials + display_name/email (not household name — that's already in the brand row)

## Steps

- [ ] **1. Extract settings content components**
  - Create `src/components/settings/AccountsContent.tsx` — pull inner JSX from `accounts/page.tsx`, accept `accounts` prop
  - Create `src/components/settings/CategoriesContent.tsx` — pull inner JSX from `categories/page.tsx`, accept `categories` prop
  - Create `src/components/settings/DangerZoneContent.tsx` — pull inner JSX from `admin/page.tsx`, accept no special props (actions are imported directly)

- [ ] **2. Create `/settings` page**
  - `src/app/(app)/settings/page.tsx`
  - Server component: fetch profile + auth check (isAdmin), `getAccounts()`, `getCategories()` in parallel
  - Render shadcn `Tabs` with `defaultValue` driven by `searchParams.tab` (fallback to `'accounts'`)
  - Tabs: Accounts, Categories, Danger Zone (hidden if `!isAdmin`)
  - Each `TabsContent` renders the corresponding `*Content` component
  - Tabs trigger navigation via `<Link href="/settings?tab=...">` (or client-side `useRouter`) so the URL updates

- [ ] **3. Redirect old routes**
  - `src/app/(app)/accounts/page.tsx` → `redirect('/settings?tab=accounts')`
  - `src/app/(app)/categories/page.tsx` → `redirect('/settings?tab=categories')`
  - `src/app/(app)/admin/page.tsx` → `redirect('/settings?tab=danger')`

- [ ] **4. Update `NavLink` component**
  - Add `icon` prop (Lucide component type)
  - New active state: `bg-muted text-foreground` + `position: relative` with a 2px `bg-primary` bar absolutely positioned on the left edge
  - Inactive: `text-muted-foreground hover:bg-muted/50`
  - Keep `rounded-md`, `h-9`, `px-3`, 10px gap between icon and label

- [ ] **5. Rebuild `(app)/layout.tsx`**
  - Fetch `profile` as before (redirect to `/login` if none)
  - Split nav into `PRIMARY_NAV` (5 items with icons) and `SECONDARY_NAV` (2 items with icons)
  - **Sidebar** (`md:flex hidden`, 232px, `w-[232px]`):
    - Brand row: logo mark area + "Budget App" + "Household" subtitle
    - Primary nav group
    - `<Separator />`
    - Secondary nav group
    - `mt-auto` footer: avatar chip (initials from display_name/email, 30×30 rounded-full, bg-muted) + user name + email
  - **Header** (`h-14`, `border-b`):
    - Desktop: right side → Import button (`/import`, `Upload` icon, `size="sm"`)
    - Mobile: left → `MobileDrawer` trigger (hamburger); center → brand name
  - **Bottom tab bar**: `md:hidden`, 5-col grid, primary items only, active = `text-primary`, inactive = `text-muted-foreground`
  - Change `h-screen` → `h-dvh` on root div

- [ ] **6. Build `MobileDrawer` component**
  - `src/components/nav/MobileDrawer.tsx` (client component)
  - shadcn `Sheet` (side="bottom", or left slide — designer showed bottom but left is more standard; use bottom per spec)
  - Contents: user chip row + `<Separator />` + all 7 nav items (primary + secondary, full-width, 18px icons)
  - Closes on nav item click

- [ ] **7. Add mobile transaction day-grouped list**
  - `src/components/transactions/TransactionDayList.tsx`
  - Accept same `rows` prop as `TransactionTable`
  - Group by date client-side: sort desc → group into `{ date, label, total, transactions }[]`
    - Label logic: "Today" / "Yesterday" / "Wed, 21 May" (short weekday + day + short month)
    - Total: sum of `Math.abs(amount_cents)` for expenses (negative amounts only)
  - Render: sticky day header row + per-transaction rows (category dot + merchant + amount)
  - In `transactions/page.tsx`: render `<TransactionDayList ... className="md:hidden" />` and add `className="hidden md:block"` to `<TransactionTable ...>`

## Manual test steps

**Desktop:**

- [ ] Sidebar shows 5 primary items + separator + 2 secondary items. Import + Settings are below the line.
- [ ] Active nav item has `bg-muted` fill + a visible 2px primary-coloured bar on the left edge.
- [ ] Header shows Import button (top-right). Clicking it navigates to `/import`.
- [ ] No search input, no bell icon, no theme toggle appear anywhere.
- [ ] Footer shows logged-in user's initials (avatar), display name or email.
- [ ] `/accounts` → redirects to `/settings?tab=accounts`. Accounts tab is selected.
- [ ] `/categories` → redirects to `/settings?tab=categories`. Categories tab is selected.
- [ ] `/admin` → redirects to `/settings?tab=danger`. Danger zone tab is selected.
- [ ] Switching tabs in Settings changes the URL query param.
- [ ] Danger zone tab is hidden for a non-admin user. Visible for admin.
- [ ] All existing page functionality works (add account, edit category, delete transactions, etc.).

**Mobile (resize browser to <768px):**

- [ ] Sidebar is hidden. Bottom tab bar appears with 5 items.
- [ ] Hamburger icon (`Menu`) appears in header left. Brand name in center.
- [ ] Hamburger opens a bottom sheet with all 7 nav items + user chip.
- [ ] Tapping a nav item in the drawer closes the sheet and navigates.
- [ ] `/transactions` shows day-grouped list (not a table). Day headers are sticky. Day totals are correct.
- [ ] `/chat` — the chat input sits above the bottom tab bar with no overlap. Input is not hidden behind the bar.
- [ ] iPhone home indicator area: bottom tab bar padding accounts for safe-area-inset-bottom.

**Edge cases:**

- [ ] `/settings` with no `?tab=` query param → defaults to Accounts tab.
- [ ] `/settings?tab=unknown` → defaults to Accounts tab.
- [ ] User with no `display_name` set → avatar falls back to first letter(s) of email.
- [ ] Transactions page with zero transactions → day list renders empty state (reuse existing empty state logic).

## Out of scope for this session

- Dark mode / theme toggle
- Header search input
- Notification bell
- Sidebar collapse to 64px (marked optional in spec — punting)
- Any dashboard or page content changes
- Import summary (#17)

---

## What actually happened

(fill in after session)

## Files created / modified

(fill in after session)

## Deferred to next session

(fill in after session)

## Status

- [ ] In progress
- [ ] Complete
- [ ] Partial — see deferred
