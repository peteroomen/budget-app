# ADR 003: Global budget caps

Date: 2026-08-31
Status: Accepted

## Context

`budgets` was keyed `(household_id, category_id, month)`. The intent was to preserve history:
what was budgeted for March stays what was budgeted for March.

Carry-forward between months was faked by an auto-seed running as a side effect of rendering
the Budgets page — it copied the most recent month's caps forward, but only when the target
month had **zero** budget rows. Three failure modes followed:

- **All-or-nothing.** Setting one cap in a fresh month permanently blocked the seed for every
  other category in that month.
- **Visit-triggered.** Months where the Budgets page was never opened had no rows at all, so
  the dashboard, summary and chat context — all filtering `.eq('month', month)` — reported
  "no budget set".
- **No propagation.** Editing a cap in one month left later already-seeded months untouched.

Observed in production on 2026-08-31: May and June carried the real 16 category caps
($11,353 / $11,656), while July and August sat on 6 stale categories ($1,504 / $2,302) written
on 2026-05-25 while browsing ahead. August was measuring $14,918 of real spend against a
$2,302 cap.

The history the `month` column bought turned out to be worth little in practice: there is no
persisted summaries table, so monthly recaps are regenerated live on every visit.

## Decision

Budget caps are **global** — one standing value per `(household_id, category_id)`, applying to
every month. The `month` column is dropped. Spend, progress bars and KPIs remain month-scoped;
only the cap becomes global.

The alternative considered was **effective-dated caps** (`month` → `effective_from`, one row per
change, lookup = latest row with `effective_from <= M`). That preserves history _and_ carries
forward, but PostgREST has no `DISTINCT ON`, so every read would fetch all rows and resolve in
application code, and "editing a past month silently rewrites all later months" needs explaining
in the UI. Not worth the complexity for a two-person tool.

Pre-collapse rows are archived to `archive.budgets_monthly` rather than deleted. The `archive`
schema is deliberately outside PostgREST's exposed-schema list, so the table is unreachable with
the anon key and needs no RLS policy of its own.

The collapse keeps the most recently _written_ cap, tie-breaking on latest month — not simply
the greatest month, which would have enshrined the stale July/August rows over the real June
ones.

## Consequences

**Easier:** caps never need re-entering or re-seeding. Every month — including ones never
opened in the app — reports against real caps in the dashboard, summary and chat. The
write-during-server-render in the Budgets page is gone, along with ~60 lines of seed machinery
and four `.eq('month', month)` filters.

**Harder:** a past month's summary now compares against today's cap rather than the cap in force
then. Since summaries regenerate live, those figures were never pinned anyway.

**Lost:** per-month cap overrides (e.g. "December only, $1,200") are no longer expressible, and
the Phase 3b rollover idea — unspent budget rolling into next month — no longer has a coherent
meaning. Both are recoverable from `archive.budgets_monthly` if ever wanted.

**Added:** with no month dimension there is no longer any way to unset a cap by simply not
carrying it forward, so a `deleteBudget` action and a "Remove budget" control were added.
