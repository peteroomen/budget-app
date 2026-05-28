# Multi-household support + profile-chip switcher

**Date:** 2026-05-28
**Branch:** feature/multi-household
**Worktree:** `/Users/peteroomen/personal/budget-app-multi-household`
**Roadmap item:** Phase 5 — Polish (new sub-section: "Multi-household")

## Goal

A user can belong to more than one household, see them in a menu under their profile chip, and switch between them. Peter can create a private "Test" household in-app that Megan cannot see. Existing data (the current shared household, all accounts/transactions/budgets) stays untouched and remains the active household for both users after migration.

## Approach

### Data model

The current schema treats `profiles.household_id` as a 1:1 link. I'll add a join table so users can have many memberships, and **repurpose `profiles.household_id` as "the currently active household"**. That keeps blast radius small — every existing server action that reads `profiles.household_id` to scope inserts ([accounts.ts](src/lib/actions/accounts.ts), [budgets.ts](src/lib/actions/budgets.ts), [categories.ts](src/lib/actions/categories.ts), [import.ts](src/lib/actions/import.ts)) continues to work without modification, and RLS via `get_my_household_id()` keeps the same single-uuid contract.

```
household_members
  user_id       uuid  FK auth.users(id)  on delete cascade
  household_id  uuid  FK households(id)  on delete cascade
  role          text  default 'member'   ('owner' | 'member')
  created_at    timestamptz default now()
  PRIMARY KEY (user_id, household_id)
```

### Migration plan (`20260528000000_multi_household.sql`)

1. Create `household_members` (cols above) + RLS enabled.
2. Backfill: `INSERT INTO household_members (user_id, household_id, role) SELECT id, household_id, 'owner' FROM profiles WHERE household_id IS NOT NULL ON CONFLICT DO NOTHING;`
3. Rewrite `get_my_household_id()` to **validate that the profile.household_id is still a valid membership**, falling back to any membership if not, else null. Stops a stale `profile.household_id` from leaking access if a user is later removed from a household.
4. Drop existing `Members can view household` SELECT policy on `households`; recreate so a user can SELECT **any** household they belong to (powers the switcher menu): `using (id in (select household_id from household_members where user_id = auth.uid()))`. UPDATE on households stays scoped to active via `get_my_household_id()`.
5. Add RLS on `household_members`: SELECT `using (user_id = auth.uid())`, INSERT `with check (user_id = auth.uid())`. No UPDATE/DELETE policies — out of scope.
6. Create SQL function `seed_default_categories(p_household_id uuid)` containing the same category list + Tide colours used by `20260524000001_seed_default_categories.sql` + `20260526000000_category_colors_tide.sql`. Called from `createHousehold`. Marked `security definer` so the action can insert without juggling RLS during a fresh household setup.

### Server actions — new file `src/lib/actions/households.ts`

- `createHousehold(name: string)` — server action. `insert into households` → `insert into household_members (user_id, household_id, 'owner')` → `rpc('seed_default_categories', { p_household_id })` → `update profiles set household_id = new.id where id = auth.uid()` → `revalidatePath('/', 'layout')`. Returns `{ id, error }`. Trim + validate name (non-empty, ≤64 chars).
- `switchHousehold(householdId: string)` — verifies membership row exists for `auth.uid()`, updates `profiles.household_id`, `revalidatePath('/', 'layout')`. Returns `{ error }`.

(Keep `updateExpectedMonthlyIncome` in [household.ts](src/lib/actions/household.ts) — it's a household-settings action, separate concern.)

### Queries

`src/lib/queries/profile.ts` gets a second function `getCurrentUserContext()` returning `{ profile, activeHouseholdName, memberships: { id, name }[] }`. Single round trip via a joined select. `getCurrentProfile` stays for callers that only need the profile (e.g. server actions checking auth).

### Profile chip restructure — desktop + mobile

New client component `src/components/nav/ProfileChip.tsx`. Props: `{ profile, activeHouseholdName, memberships, variant?: 'sidebar' | 'mobile' }`.

**Trigger (always visible):**

```
┌──────────────────────────────────────┐
│ [AV]  Peter Oomen                    │
│       Smith household                │   ← household subtitle
└──────────────────────────────────────┘
```

- Avatar: existing rounded-md initials block (no change to size/style).
- Line 1: `display_name ?? email` (truncate).
- Line 2: active household name in `text-muted-foreground text-[11px]` (truncate). Replaces the email-as-subtitle that's there today.
- The whole chip becomes a single Popover trigger button (`Button variant="ghost"`).

**Popover content:**

```
SWITCH HOUSEHOLD
  ✓ Smith household        ← active, check icon
    Test                   ← clickable, calls switchHousehold
  + Create new household   ← scrolls to / links Settings → Household
─────────────
  ⚙  Settings              ← /settings link
  ↪  Sign out              ← existing sign-out
```

- shadcn `Popover` already installed → no new dep needed. Each row is a button; the menu closes on action.
- "Create new household" links to `/settings?tab=household&new=1` to focus the create form (rather than embedding a second creation flow inside the popover, which would duplicate UI).

**Sidebar footer:** replaces the inline `SidebarUserFooter` body in [layout.tsx:17-39](<src/app/(app)/layout.tsx#L17-L39>). The standalone `SignOutButton` next to the chip goes away — sign-out moves into the popover. Theme toggle row stays separate above the chip (unchanged).

**Mobile drawer:** the chip block at the bottom of [MobileDrawer.tsx:125](src/components/nav/MobileDrawer.tsx#L125) gets the same component (variant prop tunes avatar size if needed).

### Settings → Household tab

Add a "Households" panel **above** the existing "Monthly income" form in `HouseholdContent.tsx`:

- List memberships as plain rows: name + "Active" badge on the current one + a small "Switch" button on the others.
- A `Create new household` button → inline form (single Input + Save). On submit calls `createHousehold(name)` → toast → switches to the new one (server action already does the switch + revalidate).
- Auto-open the create form when `?new=1` is in the URL (so the popover's "Create new household" deep-link lands in the right place).

The existing "Monthly income" input scopes to the active household — no change needed.

### Trade-offs / decisions captured

- **Why repurpose `profiles.household_id` instead of adding `current_household_id`?** Less churn. All server actions already read it; rewriting them all to read a new column has no functional benefit. The semantic shift is documented in this plan and the schema doc.
- **Why no `DropdownMenu` primitive?** Popover is already installed and is functionally equivalent for this menu — keeps deps lean per CLAUDE.md.
- **Why `seed_default_categories` as a DB function rather than a TS helper?** Categories are seeded today via SQL migrations. A DB function keeps the source of truth in one place and is callable from both migrations and the action. Slightly more work upfront, less drift later.
- **Roles (`owner` / `member`)** are stored but not enforced yet — the column is forward-looking. Today, any member can do anything via RLS. Permissions per role is out of scope.
- **No "Leave household" / "Delete household" UI** — out of scope. Need to think about what happens to the data (cascade delete? transfer ownership?) before exposing those.

## Steps

- [ ] 1. Create worktree at `/Users/peteroomen/personal/budget-app-multi-household` on `feature/multi-household`. Confirm `peteroomen` GitHub identity is active.
- [ ] 2. Write migration `supabase/migrations/20260528000000_multi_household.sql` — table, backfill, `get_my_household_id` rewrite, household SELECT policy update, `household_members` policies, `seed_default_categories(uuid)` function.
- [ ] 3. Apply migration locally and smoke-test: `select * from household_members;` should mirror existing profiles.
- [ ] 4. New `src/lib/actions/households.ts` — `createHousehold`, `switchHousehold`. Include input validation + auth checks.
- [ ] 5. New `getCurrentUserContext` in `src/lib/queries/profile.ts` (joined select for profile + active household name + all memberships). `Profile` type augmented or new `UserContext` type added in `src/types/index.ts`.
- [ ] 6. New `src/components/nav/ProfileChip.tsx` — Popover-based, with sign-out wired via existing `SignOutButton` logic (re-export the action or call it inline).
- [ ] 7. Update `src/app/(app)/layout.tsx` — fetch `getCurrentUserContext`, swap `SidebarUserFooter` body for `<ProfileChip />`. Remove the standalone `SignOutButton` next to it.
- [ ] 8. Update `src/components/nav/MobileDrawer.tsx` — same ProfileChip in the mobile chip slot. Accept the same context props pre-fetched in the layout (already passes `profile`; add the rest).
- [ ] 9. New `src/components/settings/HouseholdsPanel.tsx` (client component) — list + "Create new household" inline form. Consume `?new=1` to open the form by default. Insert into `HouseholdContent.tsx` above the income form.
- [ ] 10. Run `pnpm lint` + `pnpm type-check`. Fix anything that breaks.
- [ ] 11. Manual test (steps below).
- [ ] 12. Update `docs/schema/current.md`: new `household_members` table, RLS notes, `seed_default_categories` function, `get_my_household_id` behaviour change.
- [ ] 13. Update `docs/roadmap.md`: tick a new "Multi-household + profile-chip switcher" item under Phase 5.
- [ ] 14. Update `CLAUDE.md` Current State section.
- [ ] 15. Commit (conventional message: `feat: multi-household membership + profile-chip switcher`). Push branch. Open PR.
- [ ] 16. After push, monitor Vercel deployment to READY + check edge-middleware logs (per saved feedback memory).

## Manual test steps

Run locally: `source ~/.nvm/nvm.sh && nvm use 22 && pnpm dev`.

### Happy path — create + switch

- [ ] Sign in as Peter. Sidebar profile chip shows `Peter Oomen` / `<current household name>` (not email anymore).
- [ ] Click profile chip → Popover opens. See one household with a check, "Create new household", "Settings", "Sign out".
- [ ] Click "Create new household" → lands at `/settings?tab=household&new=1` with the create form already open.
- [ ] Type `Test` → Save. Toast confirms. Profile chip subtitle now reads `Test`. Sidebar nav still works.
- [ ] `/dashboard`, `/transactions`, `/budgets` all render empty states (no crashes).
- [ ] Settings → Categories tab shows the seeded default category list (Groceries, Income, etc.) with the Tide colours.
- [ ] Click profile chip → both households listed; check is now on `Test`. Click the other → switches back. All original data reappears.

### Isolation — Megan can't see Test

- [ ] Sign out, sign in as Megan. Profile chip subtitle = shared household name. Popover shows only the one household. `Test` is not visible anywhere — not in switcher, not in Settings.

### Edge cases

- [ ] Create household with empty name → validation error, no row inserted.
- [ ] Create household with 65+ char name → validation error.
- [ ] Switch to `Test`, add an account "Test Bank", import a small CSV. Switch back to the original household. Confirm "Test Bank" doesn't appear in Accounts list, Dashboard, or Transactions.
- [ ] Switch back to `Test`. Confirm "Test Bank" + its transactions are there.
- [ ] Settings → Household → Monthly income field on `Test` is independent from the original household (set it on `Test`, switch to original, original's value is unchanged).
- [ ] Mobile (resize to 360px or open the drawer): chip in MobileDrawer footer renders the same name/household subtitle and the Popover works inside the drawer.
- [ ] Direct-link to `/settings?tab=household&new=1` while not signed in → bounces to `/login` (existing auth guard).
- [ ] Refresh any page after switching → still on the newly-active household (`profiles.household_id` persists, not a cookie).
- [ ] Sign out from the popover → returns to login (existing logic).

### Sanity SQL checks (psql against local Supabase)

- [ ] `select count(*) from household_members;` matches `select count(*) from profiles where household_id is not null;` after the migration's backfill.
- [ ] `select public.get_my_household_id();` (as Peter via Supabase Studio impersonation, or via app code) returns the active household and changes after a switch.

## Out of scope for this session

- Inviting another user to a non-original household (the existing invite-link flow continues to point at the original household; cross-household invites needs design work).
- Removing yourself from a household / deleting a household (cascade vs transfer-ownership decision needed first).
- Renaming a household (separate small UI later).
- Per-role permissions (`owner` vs `member` enforcement) — column exists, not enforced.
- Cross-household read views ("show me net spend across all my households") — explicitly not the point of this feature.
- Migrating account-level data between households.
- Updating the chat / summary context so it can answer questions about a non-active household — chat is always scoped to active, which is correct.

---

<!-- Fill in below during/after the session -->

## What actually happened

Implementation matched the plan. Key decisions confirmed during build:

- `profiles.household_id` repurposed as "active household" pointer — zero changes needed to any existing server action that scopes inserts via it. `get_my_household_id()` now validates membership and falls back to the oldest membership row if the active pointer is stale.
- New SQL function `seed_default_categories(uuid)` is the single source of truth for the Tide default category list (Income → type='income', Savings Transfer → type='transfer', everything else → 'expense'). Migration body inlines the colour values from `20260524000001_seed_default_categories.sql` + `20260526000000_category_colors_tide.sql` so creating a new household via `createHousehold` doesn't need a second round of UPDATEs.
- Popover (already installed) used for the chip menu — no new shadcn primitive required.
- Mobile drawer's standalone bottom-row Sign-out is gone — it's now in the ProfileChip popover. ThemeToggle stays inline next to the chip on mobile.
- Initial `pnpm lint` auto-rewrote `tsconfig.json` formatting (same Next-lint quirk as the previous worktree session). Reverted before committing.

### Follow-up: RLS gap + savings/transfer alignment

After the first push, the in-app create flow hit `new row violates row-level security policy for table "households"` — the initial migration only declared SELECT/UPDATE policies on `households`, never INSERT. Adding an INSERT policy alone would have left a second problem: the action's `.insert().select('id').single()` post-insert SELECT also goes through RLS, and the just-created household has no membership row yet to satisfy the SELECT policy.

Fix landed in `20260528000001_create_household_rpc.sql`: a single `security definer` SQL function `create_household(p_name)` that atomically inserts the household, inserts the owner membership, seeds defaults, and flips `profiles.household_id` — all in one round trip, bypassing RLS for the multi-step setup. The server action becomes a thin `supabase.rpc('create_household', ...)` wrapper. No `households` INSERT policy needed.

Same follow-up migration `create or replace`s `seed_default_categories` so its Savings entry matches the rename in `20260527000001_savings_to_transfer.sql` (now seeds **Savings Transfer** with `type='transfer'`, colour `#7A8E84`). Without this, newly-created households would diverge from existing migrated ones.

## Files created / modified

- `supabase/migrations/20260528000000_multi_household.sql` — **new** — `household_members` table + backfill + RLS + `get_my_household_id` rewrite + `seed_default_categories(uuid)` function
- `supabase/migrations/20260528000001_create_household_rpc.sql` — **new** — `security definer` `create_household(text)` RPC + replaces `seed_default_categories` so Savings Transfer matches the migrated state
- `src/lib/actions/households.ts` — **new** — `createHousehold(name)` (now a thin wrapper around the RPC) + `switchHousehold(id)`
- `src/lib/queries/profile.ts` — added `getCurrentUserContext()` returning `{ profile, activeHouseholdId, activeHouseholdName, memberships }`
- `src/types/index.ts` — added `HouseholdMembership` + `UserContext` types
- `src/components/nav/ProfileChip.tsx` — **new** — avatar + name + household subtitle, Popover with switch list + create link + settings link + sign-out
- `src/app/(app)/layout.tsx` — fetch `getCurrentUserContext`, render `<ProfileChip />` in the sidebar footer; passes the same context through to `MobileDrawer`
- `src/components/nav/MobileDrawer.tsx` — accepts memberships props; replaced inline chip with `<ProfileChip variant="mobile" />`; removed the standalone bottom sign-out row
- `src/components/settings/HouseholdsPanel.tsx` — **new** — list of memberships with Switch buttons + inline "Create new household" form
- `src/components/settings/HouseholdContent.tsx` — accepts memberships/active/openCreateByDefault props; renders `<HouseholdsPanel />` above the income form
- `src/app/(app)/settings/page.tsx` — reads `?new=1` search param + passes membership context through

Docs:

- `docs/schema/current.md` — documented `household_members`, repurposed-`profiles.household_id` semantics, updated RLS notes, added `seed_default_categories` to function list
- `docs/roadmap.md` — ticked Phase 5 "Multi-household + profile-chip switcher" item
- `CLAUDE.md` — Current State updated

## Deferred to next session

- Invite-link flow currently still points new sign-ups at the single original household. Inviting a teammate into a _non-original_ household needs design work (per-household invite tokens? share-link from the Households panel?).
- "Leave household" / "Delete household" UI — needs a decision on cascade-delete vs transfer-ownership before exposing.
- Rename a household — small follow-up, not blocking.
- Per-role permissions (`owner` vs `member`) — column exists but isn't enforced.

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
