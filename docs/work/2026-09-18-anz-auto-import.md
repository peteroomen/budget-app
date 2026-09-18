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

## Remaining before ready for review/activation

- Build account selection/cutover UI, owner sync/pause/reconnect controls and household-readable connection status.
- Show stale, failed, incomplete and paused feed warnings on financial screens and in recap/chat context; do not infer good performance from missing data.
- Add worker/cron integration coverage for exhausted time budgets, duplicate workers, rotating history, changed refresh during pagination and failed later pages. Distinguish a busy/skipped run from successful completion in worker results.
- Verify the `/me` identity response contract and access-window boundary against the provider reference; fixture tests alone do not prove the live API contract.
- Verify setup and status UI at mobile widths. No browser UI checks have run because these screens are not built yet.
- Review historical corrections moving across date windows and replacement IDs for user-hidden rows; expand reconciliation coverage before enabling feeds.
- Run final build/checks and remote CI after the remaining implementation. Production consent, credentials, account mapping and schema activation stay separate deployment steps.

## Status

Partial — publishing as a draft PR, not ready to merge. Local 32-test suite, lint, TypeScript checks and production build pass (22 routes). Remote CI will run on the draft PR. Live consent, credentials and production schema activation remain disabled.
