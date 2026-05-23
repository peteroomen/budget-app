# Auth + Household

**Date:** 2026-05-23  
**Branch:** feature/auth-household  
**Roadmap item:** Phase 1 — Auth & Household (build order item #2)

## Goal

Two users can sign in (or sign up) with email/password, create a named household, and Megan can join via an invite link. Protected app routes redirect to login when unauthenticated. The app shell (sidebar + header) is in place.

## Approach

**Auth:** Supabase email/password only. No OAuth. Forms use React 19 `useActionState` + server actions so the login page can show inline error messages without a full page reload while staying a server-action-first architecture.

**Invite link:** Add `invite_token uuid UNIQUE DEFAULT gen_random_uuid()` to `households`. When Peter creates a household a token is generated automatically. The shareable link is `/invite?token=<uuid>`. Accepting it links Megan's profile to that household. Token is never invalidated — two users, low risk, can add expiry later if needed.

**Household check:** Middleware handles auth-guard only (no DB query on every request). The `(app)/layout.tsx` server component queries the current profile and redirects to `/onboarding` if `household_id` is null. The onboarding page redirects to `/dashboard` if the user already has a household (idempotent).

**Simplified invite UX:** `/invite?token=` shows the household name and a "Join this household" button. If the visitor is not logged in, the button redirects to `/login?invite=<token>`. After sign-in/sign-up the login action reads the `invite` param and calls `joinHousehold` before redirecting to `/dashboard`.

**App shell:** Real sidebar with `<Link>` nav items + active-state highlight, and a header with the household name and a sign-out button. Desktop-only sidebar for now (mobile burger menu is out of scope).

**shadcn components:** No components are installed yet. Install `button`, `input`, `label`, `card`, `separator` before building UI.

## Steps (revised — leaner scope)

- [ ] Install shadcn components: `button input label card separator`
- [ ] Update `src/lib/supabase/middleware.ts` — remove `/invite` exception; add redirect to `/dashboard` for authenticated users hitting `/login`
- [ ] Create `src/lib/actions/auth.ts` — `signIn`, `signOut` server actions (no sign-up)
- [ ] Create `src/lib/queries/profile.ts` — `getCurrentProfile()` (server-side)
- [ ] Create `src/components/auth/LoginForm.tsx` — client component, `useActionState`, sign-in only
- [ ] Create `src/components/auth/SignOutButton.tsx` — client component wrapping `signOut` action
- [ ] Create `src/components/nav/NavLink.tsx` — client component with active-state via `usePathname`
- [ ] Update `src/app/(auth)/login/page.tsx` — real Card + LoginForm implementation
- [ ] Update `src/app/(app)/layout.tsx` — server component: query profile, redirect to `/login` if not found; real sidebar + header
- [ ] Create `docs/setup/household-setup.md` — one-time SQL snippet for household creation + user linking
- [ ] Verify: `pnpm lint` and `pnpm type-check` pass

## Out of scope for this session

- Invite link flow (dropped — use Supabase admin invite instead)
- Onboarding / household creation UI (one-time SQL instead)
- Sign-up form (public registration disabled in Supabase)
- Password reset / forgot password
- Mobile sidebar / hamburger menu
- Invite token migration
- Supabase local stack testing (requires Docker)

---

<!-- Fill in below during/after the session -->

## What actually happened

- Approved the leaner scope during planning: dropped invite link flow, onboarding UI, and sign-up form. Use Supabase admin invite + one-time SQL for Megan's setup instead.
- Discovered no shadcn components were installed (empty `components/ui/`). Installed button, input, label, card, separator using Node 22 (system node is v10, too old for shadcn CLI).
- Existing `updateSession` middleware already had partial routing logic (removed `/invite` exception, added authenticated-user redirect away from `/login`).
- `(app)/layout.tsx` is a server component that queries the profile and redirects to `/login` if missing — no middleware DB calls needed.
- `LoginForm` uses React 19 `useActionState` with a `signIn` server action; inline error display for Supabase auth errors.
- `SignOutButton` wraps `signOut` server action in a `<form>` to avoid client event handlers in a server component context.
- `NavLink` is a minimal client component using `usePathname()` for active-state highlight.
- `pnpm lint` and `pnpm type-check` both pass clean.

## Files created / modified

**Modified:**

- `src/lib/supabase/middleware.ts` — updated routing (removed /invite exception, added redirect-away for authed users on /login)
- `src/app/(auth)/login/page.tsx` — real Card + LoginForm implementation
- `src/app/(app)/layout.tsx` — real app shell with sidebar, header, profile query, auth redirect

**Created:**

- `src/lib/actions/auth.ts` — signIn, signOut server actions
- `src/lib/queries/profile.ts` — getCurrentProfile query helper
- `src/components/auth/LoginForm.tsx` — sign-in form (useActionState)
- `src/components/auth/SignOutButton.tsx` — sign-out button (form + server action)
- `src/components/nav/NavLink.tsx` — nav link with active state
- `src/components/ui/button.tsx` — shadcn Button
- `src/components/ui/input.tsx` — shadcn Input
- `src/components/ui/label.tsx` — shadcn Label
- `src/components/ui/card.tsx` — shadcn Card
- `src/components/ui/separator.tsx` — shadcn Separator
- `docs/setup/household-setup.md` — one-time SQL for household + user linking

## Deferred to next session

- Household setup is manual (SQL) until real accounts exist in Supabase. See `docs/setup/household-setup.md`.
- Supabase local stack testing still requires Docker.
- Mobile sidebar / hamburger menu.

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
