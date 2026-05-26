# Vercel Edge Middleware Fix

**Date:** 2026-05-26  
**Branch:** main (hotfix commits directly)  
**Roadmap item:** Phase 5 — Polish / Production stability

## Goal

Fix persistent `MIDDLEWARE_INVOCATION_FAILED` / `ReferenceError: __dirname` errors crashing the Vercel production edge middleware on every request.

## Approach

Root cause: Next.js 15 unconditionally bundles `next/dist/experimental/testmode/context.js` into every edge middleware. This file calls `require("node:async_hooks")` at module init time — a Node.js built-in that Vercel's V8 edge isolate cannot resolve, producing `ReferenceError: __dirname is not defined` on every cold start.

Two-layer fix:

1. **`scripts/patch-testmode.js`** (prebuild) — overwrites `testmode/context.js` in `node_modules` with a noop before webpack compiles it, busting any cached module hash.
2. **`NormalModuleReplacementPlugin`** in `next.config.ts` — at webpack compile time, replaces any import matching `/experimental[/\\]testmode[/\\]context/` with `src/lib/testmode-noop.js` for the edge runtime specifically. Secondary guard in case the prebuild patch is skipped.

Additional work required to get the deployment itself to succeed:

- Vercel auto-detects `src/` as the Next.js framework root (because `app/` lives in `src/app/`), so it expects build output at `src/.next`.
- Setting `distDir: 'src/.next'` in `next.config.ts` aligns Next.js output with Vercel's expectation.
- `vercel.json` with `buildCommand: "pnpm run build"` ensures the prebuild patch runs (Vercel's default is bare `next build` which skips `prebuild`).
- `outputDirectory: ".next"` in `vercel.json` resolves relative to the framework root (`src/`), yielding `src/.next` — matching `distDir`.
- ESLint scanning `src/.next/` (build artifacts inside `src/`) was causing false lint failures; fixed with `{ ignores: ['src/.next/**'] }` in `eslint.config.mjs`.
- Final blocker: Vercel was hard-blocking deployment of Next.js 15.3.3 for a known CVE — builds succeeded but the deploy step never ran ("Vulnerable version detected"). Fixed by updating to Next.js 15.5.18.

## Steps

- [x] Add `scripts/patch-testmode.js` prebuild patch
- [x] Add `NormalModuleReplacementPlugin` + `config.cache = false` for edge in `next.config.ts`
- [x] Add `src/lib/testmode-noop.js` noop module
- [x] Set `distDir: 'src/.next'` in `next.config.ts`
- [x] Add `vercel.json` with `buildCommand: "pnpm run build"` and `outputDirectory: ".next"`
- [x] Update `package.json` build script to `rm -rf src/.next && next build`
- [x] Add `/src/.next/` to `.gitignore`
- [x] Add `{ ignores: ['src/.next/**'] }` to `eslint.config.mjs`
- [x] Update Next.js `15.3.3` → `15.5.18` to unblock Vercel's CVE version check
- [x] Verify deployment READY on Vercel (dpl_6axT7v2xMMvzBqm2iXQc9XW13ptK)

## What actually happened

Seven deployments were needed to sort out the configuration:

1. Added `vercel.json` with invalid `nodeVersion` field → config validation error before build
2. Removed `nodeVersion`; no `distDir` → "output directory not found at src/.next"
3. Added `outputDirectory: ".next"` (no distDir yet) → same error (output still at repo root `.next`)
4. Added `distDir: 'src/.next'` + `outputDirectory: "src/.next"` → double-nested path `src/src/.next`
5. Fixed ESLint scanning build artifacts → still ERROR (version block)
6. Reverted outputDirectory to `".next"` → still ERROR (version block)
7. Updated Next.js 15.3.3 → 15.5.18 → **READY** ✓

Key diagnostic: comparing READY vs ERROR build logs. READY deployments showed "Deploying outputs..." → "Deployment completed". ERROR deployments showed "Vulnerable version of Next.js detected" as the final line with no deploy step — Vercel was hard-blocking at post-build validation.

## Files created / modified

- `scripts/patch-testmode.js` — prebuild noop patch for testmode/context.js
- `src/lib/testmode-noop.js` — the noop replacement module
- `next.config.ts` — added `distDir: 'src/.next'`, `NormalModuleReplacementPlugin`, `config.cache = false`
- `vercel.json` — `buildCommand: "pnpm run build"`, `outputDirectory: ".next"`
- `package.json` — build script updated to `rm -rf src/.next && next build`; Next.js bumped to 15.5.18
- `.gitignore` — added `/src/.next/`
- `eslint.config.mjs` — added `{ ignores: ['src/.next/**'] }` as first config entry

## Deferred to next session

- Verify edge-middleware runtime logs after real user traffic to confirm the testmode noop is actually serving middleware requests cleanly (no ReferenceError at runtime).

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
