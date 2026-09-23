# Production setup audit before first ANZ import

**Date:** 2026-09-23
**Branch:** claude/tide-production-anz-setup-7gaa7e
**Roadmap item:** Phase 5 — ANZ automatic imports (activation)

## Goal

Establish the real production state after PR #41 and list the exact, ordered actions that remain before the first
manual ANZ sync. Read-only: no production writes were made in this session.

## Verified findings (2026-09-23, ~00:45–01:05 UTC)

| Finding                                                                                                                                                      | How verified                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `main` = `3db1a6b` (#41), deployed to production as `dpl_76DKfMgqwhyv7NuQUsVcN2bx68Lt`, READY                                                                | git, Vercel `list_deployments`                                                |
| Supabase `ynsywxqgtsubzhibdjdz` was **paused** (free plan), came back during this session, now `ACTIVE_HEALTHY`                                              | `get_project` went `COMING_UP` → `ACTIVE_HEALTHY`; postmaster start 00:51 UTC |
| Data intact after restore: 1 household, 2 members, 2 NZD accounts, 652 CSV transactions (2026-04-01 → 2026-08-28), 64 budget rows (May–Aug × 16), 35 uploads | read-only SQL                                                                 |
| **Production schema is at `20260528000001_create_household_rpc`. Four repo migrations are unapplied, not three.**                                            | table/column/function/constraint inspection                                   |
| No runtime errors and no production requests in the last 7 days                                                                                              | Vercel `get_runtime_errors`, `get_runtime_logs`                               |
| Vercel env vars could not be read (API 403). Their presence is **unverified**.                                                                               | `filter_project_envs`                                                         |
| PRs #38 and #39 still open, based on `1d46345` (pre-#40/#41)                                                                                                 | GitHub                                                                        |

### Pending migrations, in required order

| Migration                              | Evidence it is missing                                                       | What breaks without it                                        |
| -------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `20260529000000_import_history`        | no `public.import_history`                                                   | Import page "Recent imports"; `commit_import` inserts into it |
| `20260831000000_global_budget_caps`    | `budgets.month` still exists, 3-column unique key, no `archive` schema       | Budgets page upserts on `(household_id, category_id)`         |
| `20260907000000_financial_reliability` | no `financial_snapshot`, `stage_import`, `commit_import`, `recurring_source` | Dashboard, transactions, summary, chat, imports               |
| `20260918000000_anz_bank_sync`         | no `bank_*` tables, no `bank_revision`                                       | Settings → Accounts bank section, sync                        |

The production site on `3db1a6b` is therefore expected to fail on nearly every data page right now. That is
consistent with the zero-traffic logs, but it has not been observed directly.

The import-history migration shipped in PR #32 (May) and was never applied, so drift predates this workstream.
`supabase_migrations.schema_migrations` does not reflect the repo: it records only `create_household_rpc`, plus
six migrations from other apps (`stacks_*`, `forkcast_init`) that share this Supabase project in their own
schemas. **Do not use the migration table as the source of truth.** Inspect the schema itself.

### Rehearsal

The four pending migrations were applied in order on a local PGlite database. It was first built from the 13
already-applied migrations and seeded to match production: 1 household, 2 members, 2 NZD accounts, 652 CSV rows
with mixed category sources and recurring flags, 4 months × 16 caps, and uploads. All four applied cleanly. Then
as an authenticated member:
`financial_snapshot` returned 652 rows, 16 caps and no bank links, and `stage_import` + `commit_import`
de-duplicated and wrote `import_history`. As service role, `link_bank_account` accepted a mapping. The repo's 39
tests also pass. This is a synthetic rehearsal, not a production run. Script: session scratchpad `rehearse.cjs`
(not committed).

Policy names the reliability migration drops (`Users can insert own memberships`, the three `uploads` policies)
exist in production under exactly those names. No `uploads` row has a null account.

### Budget collapse preview (read-only query of what migration 20260831 will keep)

The August row wins for all 16 categories, since it was the latest written. It differs from June for Fuel ($400 vs
$300), Health ($400 vs $200) and Subscriptions ($210 vs $200). All 64 rows go to `archive.budgets_monthly`.

## Remaining actions before the first manual import

1. **Approve production writes** (user). Nothing below runs until then.
2. **Back up** (in SQL, before any DDL). Free plan: no PITR, so snapshot to the `backup` schema:
   `transactions`, `budgets`, `merchant_category_map`, `categories`, `accounts`, `uploads`, `household_members`,
   `profiles`, `households`, all suffixed `_20260923`.
3. **Apply the four migrations in order** with `apply_migration`, using the repo file names. Stop on the first error.
   The reliability and ANZ files carry their own `begin/commit`.
4. **Verify the schema**: `import_history`, `archive.budgets_monthly` (64 rows), 16 budgets, `financial_snapshot`,
   `bank_links`, `bank_revision`, 652 transactions all with `recurring_source='manual'`. Run `get_advisors security`.
5. **Smoke-test production pages** as a signed-in user: dashboard, transactions, budgets, summary, import.
   Watch Vercel runtime errors.
6. **Confirm Production-only Vercel env vars exist** (user, in the dashboard, because the API returns 403):
   `AKAHU_APP_TOKEN`, `AKAHU_USER_TOKEN`, `AKAHU_OWNER_USER_ID`, `AKAHU_HOUSEHOLD_ID`, `CRON_SECRET`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `BANK_SYNC_ENABLED=false`. `bankConfig()` silently
   returns `null` if any is missing. Non-secret values from production:
   - `AKAHU_HOUSEHOLD_ID` = `03be32b0-ada7-4763-a423-d075ef7311dd` (household "Oomen"; Peter and Megan are both owners, and it is active for both)
   - `AKAHU_OWNER_USER_ID` = Peter's auth UUID `4abcea11-b313-4397-bc8e-c92dc020d731` (assumes the Akahu profile is Peter's)
     Redeploy production after adding or changing any of them.
7. **Link and sync** (user, in the UI): Settings → Accounts → Find my ANZ accounts → map → cutover date.
   Target Tide account: **Shared Spending** (all 652 CSV rows). **Savings** has no rows yet.
   CSV coverage ends **2026-08-28**, so the suggested cutover is 2026-08-29. Confirm the last statement really
   covered up to 08-28. With that cutover, the recent window has no CSV overlap, so the ambiguous-overlap stop
   should not trigger. Then **Sync now**.
8. **Compare with the ANZ statement** from 2026-08-29 to today: counts, dates, amounts.
9. **Only then** set `BANK_SYNC_ENABLED=true` and redeploy.

## Risks noted

- **Free-plan auto-pause.** The project pauses after about a week without activity, which is what just happened.
  A paused database breaks the site and the daily sync. While the flag is false the cron cannot keep it awake:
  `runBankSync()` returns `{ disabled: true }` before creating a client. Once enabled, the daily sync queries the
  database, which should count as activity. That is unconfirmed; decide before relying on daily imports.
- The Supabase project is shared with other apps (`stacks`, `forkcast` schemas). Pausing or restoring it affects them too.
- PR #39's chat-model bump conflicts with the unmerged `claude-sonnet-5` change on `claude/weekly-emails-planning-xhn5uq`.

## Out of scope for this session

Production writes, `BANK_SYNC_ENABLED=true`, catch-up review, weekly emails, PRs #38/#39.

---

## What actually happened

Read-only audit. The database was paused on arrival and restored during the session (not by this session).
The migration gap is four files, not the three assumed in the handoff. Rehearsed the migrations locally.

## Files created / modified

- `docs/work/2026-09-23-production-setup.md` (this file)
- `CLAUDE.md` (Current State)

## Deferred to next session

Steps 1–9 above, pending approval of production writes.

## Status

- [x] Partial — see deferred
