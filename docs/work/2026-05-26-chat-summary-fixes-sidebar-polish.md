# Chat + Summary Fixes, Sidebar Polish

**Date:** 2026-05-26  
**Branch:** claude/thirsty-chatelet-df9f7d  
**Roadmap item:** Phase 5 — Polish

## Goal

Fix broken chat and monthly summary (Anthropic API key not reaching the API), then polish the sidebar footer — dark mode switch row and icon-only sign-out button.

## Approach

Root cause of both API failures: Claude for Desktop injects `ANTHROPIC_API_KEY=""` into the macOS user environment. Next.js follows dotenv convention and never overrides an env var that is already set, so `.env.local`'s real key was silently ignored. Renamed the project variable to `TIDE_ANTHROPIC_API_KEY` which Desktop doesn't touch.

Also fixed three co-incident issues:

- `@ai-sdk/anthropic` v3 provider was created at module level — moved inside handler so env is read at request time
- Monthly summary: model ID was `claude-sonnet-4-6` (non-existent) → `claude-sonnet-4-5`
- Monthly summary: Claude occasionally wraps JSON in markdown fences — strip them before `JSON.parse`

Sidebar: extracted dark-mode control to a dedicated `SidebarThemeRow` (Moon icon + label + shadcn Switch). Fixed SSR hydration mismatch by deferring Switch render until after mount. Sign-out converted to icon button (`LogOut`, Lucide) with a Tooltip.

## Steps

- [x] Diagnose chat 401 — intercept outbound headers, confirm `x-api-key: ""`
- [x] Trace empty key to Claude Desktop macOS env injection
- [x] Rename `ANTHROPIC_API_KEY` → `TIDE_ANTHROPIC_API_KEY` in `.env.local` + `.env.example`
- [x] Update `src/app/api/chat/route.ts` — use `TIDE_ANTHROPIC_API_KEY`, move provider inside handler
- [x] Update `src/app/(app)/summary/page.tsx` — same env var fix, fix model ID, strip JSON fences, add error logging to catch
- [x] Add shadcn `Switch` component
- [x] Create `SidebarThemeRow` in `ThemeToggle.tsx` — Moon + label + Switch, `mounted` guard
- [x] Keep `ThemeToggle` icon button for mobile drawer
- [x] Update `AppLayout` — insert `SidebarThemeRow` above separator, remove toggle from user chip
- [x] `SignOutButton` — icon-only with `LogOut` + `Tooltip`

## Manual test steps

- [x] Chat: send a message → response streams correctly
- [x] Summary: reload /summary → JSON parses, recap renders (~15s)
- [x] Summary: month with no transactions → empty state, no crash
- [x] Dark mode switch renders in sidebar, toggling changes theme immediately
- [x] No hydration warning in console
- [x] Sign-out icon shows tooltip on hover; clicking signs out

## Out of scope for this session

- Vercel env var (`TIDE_ANTHROPIC_API_KEY`) needs to be set in project settings before deploying
- Summary "Regenerate" button

---

## What actually happened

Exactly as planned. The env-var discovery came from intercepting the fetch headers — `"x-api-key":""` — then tracing it back to `printenv` confirming Claude Desktop sets `ANTHROPIC_API_KEY=` in the shell. Three iterations of debugging (baseURL, empty key, JSON fences) each resolved cleanly once the root cause was isolated.

## Files created / modified

- `.env.example` — `ANTHROPIC_API_KEY` → `TIDE_ANTHROPIC_API_KEY`
- `src/app/api/chat/route.ts` — env var rename, provider moved inside handler, debug logging removed
- `src/app/(app)/summary/page.tsx` — env var rename, model `4-5`, fence strip, catch logging
- `src/components/theme/ThemeToggle.tsx` — added `SidebarThemeRow` export with `mounted` guard; kept `ThemeToggle` for mobile
- `src/components/ui/switch.tsx` — new (shadcn)
- `src/app/(app)/layout.tsx` — wired `SidebarThemeRow`, cleaned `SidebarUserFooter`
- `src/components/auth/SignOutButton.tsx` — icon button + Tooltip

## Deferred to next session

- Set `TIDE_ANTHROPIC_API_KEY` in Vercel project env before deploying to production

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
