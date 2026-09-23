# ANZ automatic imports

Approved scope: the user requested the next PR after the reliability PR, then requested merging #40. This implements stage 2 of the audit. No live bank connection or production credentials are activated during development.

## Plan

- Use the documented Akahu Personal App read-only endpoints, bound to one configured Tide owner and household; account selection remains explicit.
- Store account links, provider identities, original bank fields, resumable page staging, leases, sync results and bank refresh timestamps.
- Fetch only settled transactions; reconcile complete windows atomically, preserve annotations, retain deletion tombstones, and reject ambiguous file overlaps.
- Fetch a recent 30-day overlap and rotate through older 30-day windows from the selected cutover date. Resume incomplete pages on later invocations; never infer deletion from incomplete or inactive data.
- Add a production-only, secret-authenticated daily job plus owner-operated sync/pause/reconnect controls. Do not invoke paid categorisation automatically.
- Add synthetic provider/database regression coverage; run lint, types and production build; open a PR from the merged reliability code.

## Manual test steps

With synthetic fixtures, select an external ANZ NZD spending/savings account and a Tide account. Inspect the cutover date and map it. Verify repeated jobs do not duplicate rows, partial pages do not alter totals, corrections preserve notes/categories, and removed/hidden transactions do not reappear. Verify inactive consent and stale data appear visibly. Test unrelated users/households, missing cron secret and preview deployments. Inspect mobile setup controls.

## What actually happened

- Merged reliability PR #40 after correcting its pnpm 11 dependency build policy; its GitHub Actions workflow passed. ANZ work is based on the merged tree.
- Implemented the Akahu adapter, explicit owner/household configuration, mapping actions, daily cron endpoint, resumable staging and atomic PostgreSQL reconciliation.
- Added 13 tests (32 total including parent suites), covering NZ DST boundaries, strict provider payloads, pagination, preview isolation, service-only permissions, partial-page retries, lease exclusion, corrections preserving annotations, removals, deletion tombstones, statement adoption/ambiguity rollback and membership revocation.
- Corrected invalid date normalisation, null-lease acceptance, inconsistent database lock ordering and statement dedupe counting removed bank rows during verification.
- Recorded the full enhancement sequence in `docs/roadmap.md`, including the user's repeated request for weekly update emails: monthly progress, good/bad budget tracking, outstanding review count and freshness warnings.
- No live bank requests, paid AI calls, email sends or production migration changes were made.

## Files created / modified

- `src/lib/bank/`: Akahu parsing/API adapter, server configuration, worker and safe status descriptions.
- `src/lib/actions/bank.ts`, `src/app/api/cron/bank-sync/route.ts`, middleware and cron configuration.
- `supabase/migrations/20260918000000_anz_bank_sync.sql`: links, runs, staging, records, reconciliation and financial-query filtering.
- Transaction/import/recurring queries and transaction source type.
- `tests/bank.test.cjs`, `tests/bank-database.test.cjs`, service role in the existing migration fixture.
- Roadmap, schema, ADR 005, environment example and session instructions.

## Original draft checklist (resolved in completion session below)

- Build account selection/cutover UI, owner sync/pause/reconnect controls and household-readable connection status.
- Show stale, failed, incomplete and paused feed warnings on financial screens and in recap/chat context; do not infer good performance from missing data.
- Add worker/cron integration coverage for exhausted time budgets, duplicate workers, rotating history, changed refresh during pagination and failed later pages. Distinguish a busy/skipped run from successful completion in worker results.
- Verify the `/me` identity response contract and access-window boundary against the provider reference; fixture tests alone do not prove the live API contract.
- Verify setup and status UI at mobile widths. No browser UI checks have run because these screens are not built yet.
- Review historical corrections moving across date windows and replacement IDs for user-hidden rows; expand reconciliation coverage before enabling feeds.
- Run final build/checks and remote CI after the remaining implementation. Production consent, credentials, account mapping and schema activation stay separate deployment steps.

## Status

Implementation complete for PR review. Local 39 tests, lint, TypeScript checks and production build pass (22 routes). Mobile/desktop component checks pass with synthetic actions. Remote CI gates the ready-for-review transition. Production activation remains a separate step.

## Completion session

User explicitly approved steps 1–2: finish setup/status UI, freshness warnings and integration verification, then mark PR #41 ready. Keep scheduled imports disabled; do not use previously shared credentials or modify production settings. Separate production setup availability from the daily-import switch so mapping can precede activation. Validate the provider identity contract, worker/cron failures, historical reconciliation, mobile UI and production build before publishing.

### Completion outcome

- Added the Settings account discovery, explicit mapping/cutover and household-sharing confirmation; inactive accounts cannot be selected. Added manual sync, pause/resume, external Akahu reconnect access and separate bank-refresh/import/coverage timestamps. Setup and manual sync work in production while scheduled imports remain disabled.
- Added global visible warnings for failed, paused, stale, pending and incomplete-history feeds. Bank status is part of the financial snapshot used by recap/chat; prompts explicitly qualify conclusions when data is incomplete.
- Distinguish busy/time-limited workers from completed syncs, rotate accounts by last attempt to avoid starvation and require the cron secret before treating scheduling as enabled. Recent freshness is independent of history refreshes.
- Confirmed `/me` user fields against Akahu's official SDK user model and transaction history limits against the provider guide. No authenticated provider requests were made.
- Expanded to 39 local tests: actual adapter → worker → PostgreSQL staging/commit, failed later pages/resume, refresh reset, rotating history, busy workers, time limits, replacement IDs and cross-window corrections; owner/household action boundaries; cron authentication; snapshot freshness in recap/chat.
- Browser story: account discovery → account/date selection → link confirmation → sync result → pause/resume. Verified at 360px and 1280px using real components with synthetic actions; inactive options, readonly/error states, no horizontal overflow and no page errors. The agent-browser daemon could not start in this runtime; direct Playwright with a local Chromium package completed the checks. Fixed a confirmation-message state capture found during inspection.
- React checklist: server-only auth/config access, typed client props, no DB access in client components, labelled controls, disabled pending actions, live status messages and focused components. Production build succeeds with all 22 routes.
- Added `docs/anz-setup.md` with production-only variable names, migration prerequisites, first-import comparison, enabling the schedule, recovery and explicit provider-ID/history limitations. No production changes or credential reads were made.

### Remaining deployment checks (steps 3–4, not part of this approval)

Verify/apply production migrations; configure owner/household UUIDs and cron secret; deploy; have the configured owner map accounts and compare the first manual import with a real statement; then approve scheduled activation. Replacement IDs cannot inherit guessed annotations or tombstones, and cross-window historical corrections converge over later checks; these limitations are documented rather than hidden.
