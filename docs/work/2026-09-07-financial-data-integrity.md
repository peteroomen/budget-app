# Financial data integrity

**Date:** 2026-09-07  
**Branch:** fix/financial-data-integrity  
**Roadmap item:** Phase 5 — reliability foundation before automatic imports

## Goal

Make existing household access, imports and financial reporting trustworthy before connecting bank feeds.

## Approval

The user approved the reliability stage of the audit in this session: "Ok open a PR for reliability first then". The previously presented audit and four-stage plan supply the scope; no further approval is needed for this implementation.

## Approach

- Close household self-enrolment and cross-household category writes; restrict internal database functions and orphan upload access.
- Stage imports server-side and commit with an account lock, durable idempotency, occurrence-aware duplicate reconciliation and transactional history/mapping writes.
- Use a shared signed-money calculation and complete, deterministically paginated reads. Fail visibly when financial data cannot be loaded.
- Preserve manual category and recurring choices; validate input and AI output; standardise NZ calendar handling and budget thresholds.
- Add deterministic regression checks and execute migrations against an isolated PostgreSQL-compatible test database. No live AI, bank or email calls.

## Steps

- [x] Database ownership and atomic import migration
- [x] Input parsing, imports and human override preservation
- [x] Shared financial calculations, complete reads and visible failures
- [x] NZ dates, budget states and authenticated redirects
- [x] Regression tests, lint, types and build
- [ ] Documentation, commit, push and PR

## Manual test steps

- Import a valid statement, inspect the preview, confirm and retry: no duplicate rows; identical legitimate purchases in one statement remain distinct.
- Reject a file containing malformed dates/amounts with row-specific feedback; a failed categoriser must still permit an uncategorised import.
- Confirm a refund restores its category budget, transfers stay excluded, and zero/exact caps render consistently.
- Correct a category and recurring flag, then run automatic processing: manual choices survive.
- Switch between two authorised households; reject direct membership or category access to an unrelated household.
- Force a query failure and verify an error instead of zero spending.
- Test invalid month URLs and the NZ month boundary.

## Out of scope

ANZ connectivity, catch-up review, weekly emails, changes to production data, and the separate feature work in PRs #38/#39.

## What actually happened

Implemented migration-backed import confirmation and household isolation, complete financial snapshots with shared refund/income logic, visible failures, strict CSV/PDF and recap validation, current merchant-rule resolution and atomic manual/automatic category writes. Added provenance protection to recurring detection, NZ date handling, transaction search across descriptions, import row previews, zero/exact-cap handling, and an overflow-safe budget table. Added 19 deterministic tests and a CI workflow.

Local validation: all 19 regression checks, lint, TypeScript validation and production build passed on Node 24.19.0. The build used synthetic Supabase public configuration. No live AI, bank, email or production database calls were made.

## Files created / modified

Key changes: `supabase/migrations/20260907000000_financial_reliability.sql`; `src/lib/finance/`, `src/lib/import/`, financial query modules and import/category/recurring actions; import/budget/dashboard/recap/transaction components; auth redirects; `tests/`; `.github/workflows/reliability.yml`; schema and ADR 004. Full paths are in the PR diff.

## Deferred to next session

Bank feed, review and email stages remain separate. Recap caching and on-demand generation, stronger recurring cadence inference, full transaction-list UI pagination, and broad visual redesign are deferred. Existing recurring flags retain their state and are marked manual because prior provenance cannot be reconstructed.

Deployment gates: verify the production migration ledger, coordinate the global-caps migration with this migration and application deploy, and test authenticated flows against a disposable staging household. PGlite tests cover PostgreSQL logic and RLS with synthetic auth; browser/Supabase Auth integration and genuine multi-connection concurrent commits have not been exercised. No production migration or deploy was performed.

Before deployment, inspect pre-existing cross-household category references and non-expense/negative budgets; this migration blocks new category boundary violations but does not rewrite historical financial data. Import reconciliation cannot distinguish separate partial statements containing identical purchases without bank IDs.

## Status

- [ ] In progress
- [x] Complete — implementation verified; opening PR from the committed branch.
