# ADR 005: ANZ imports through an Akahu Personal App

Date: 2026-09-18
Status: Accepted design; implementation in draft

## Context

The household wants automatic ANZ imports before adding transaction catch-up and weekly finance emails. Statement imports remain useful for history and fallback. Bank updates must preserve categories, notes and recurring choices, and retries must not duplicate purchases.

## Decision

Use one Akahu Personal App, bound in server configuration to one Tide user and household. Map each supported ANZ NZD checking/savings account explicitly. Credentials stay server-side; production-only configuration and a secret-authenticated daily cron gate access. Read settled transactions only. Use existing merchant rules for categorisation; no unattended paid AI calls.

Stage all pages of a fixed NZ calendar window before atomically applying it. An expiring lease supports retries; provider refresh changes invalidate staged pages. Reconcile by provider ID, preserving manual annotations. Complete-window absence marks bank removals; user deletion retains a tombstone. Ambiguous overlap with imported statements stops the window for resolution rather than guessing.

Each invocation handles a recent overlap and an older 30-day window, within a time budget. Historical windows rotate from the selected cutover date. Store bank refresh time separately from successful import time; a successful read of cached data is not a fresh bank refresh. Expose pauses, errors and stale/partial coverage before activation.

## Consequences

- This supports the configured person's bank connections, not separate credentials for every household member.
- The daily job reads Akahu's cache; it does not trigger a bank refresh. Personal Apps do not provide webhooks.
- Historical reconciliation is gradual. Corrections moving between windows can be reflected across separate invocations.
- Provider timestamp stability is the available consistency check; it cannot guarantee a snapshot if the provider changes data without updating that timestamp.
- `bank_revision` and `bank_changed_at` provide hooks for the later review queue; this PR does not implement review state or email sending.
- Deployment requires migration verification, completed setup/status UI, credentials and explicit account mapping. The draft must remain disabled.

## Provider references

- [Personal Apps](https://developers.akahu.nz/docs/personal-apps)
- [Transaction access and pagination](https://developers.akahu.nz/docs/accessing-transactional-data)
- [Account model](https://developers.akahu.nz/docs/the-account-model)
- [Data refreshes](https://developers.akahu.nz/docs/data-refreshes)
