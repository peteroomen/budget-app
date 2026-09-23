# Weekly emails

**Date:** 2026-09-18 (revised 2026-09-23 after PR #41 merged)
**Branch:** claude/weekly-emails-planning-xhn5uq (session-designated; used in place of `feature/weekly-emails`)
**Roadmap item:** Phase 5 — Polish · the "weekly emails" stage carved out of the 2026-09-07 reliability audit
(roadmap "Future → Push / email notifications: Resend for email")

## Goal

Every week, each opted-in household is emailed a digest of the last 7 days — real numbers plus a short
Claude-written note — sent automatically by a Vercel cron job, configurable from Settings → Household,
and testable on demand without waiting for the schedule.

## Decisions taken up front (confirmed with the user before planning)

| Question   | Decision                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content    | Hybrid — deterministic digest, plus a 2–3 sentence Claude note. A failed or malformed AI call drops the note only; the email still sends.                       |
| Trigger    | Vercel cron daily at 18:00 UTC; the route gates on the NZ weekday, so NZDT/NZST shifts never move the send and it stays within Vercel Hobby's daily-cron limit. |
| Recipients | Household-level toggle + send day on `households`; sends to every member's `profiles.email`.                                                                    |
| Provider   | Resend, with an ADR — `architecture.md` records no email decision today.                                                                                        |

**Model — resolved 2026-09-23.** `claude-sonnet-5`, matching the rest of the app: all four existing
inference sites were moved onto Sonnet 5 in the same session (commit `064b57e`). The digest numbers never
come from the model; it writes the note only.

## Approach

### Revised 2026-09-23 — what PR #41 (ANZ auto-import) already provides

This plan was written against `e39827d`. PR #41 landed afterwards and makes several steps smaller. Re-read
these before building:

| Plan assumed                              | Now true on `main`                                                                                                                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First service-role client in the codebase | `src/lib/bank/sync.ts` already builds one from `bankConfig()`. Follow that pattern, or factor the shared helper out of it.                                                                          |
| First cron route                          | `/api/cron/bank-sync` exists with a timing-safe `Bearer $CRON_SECRET` check. **Copy its auth block verbatim** — it guards `byteLength` before `timingSafeEqual`, which throws on a length mismatch. |
| Add `/api/cron` to `PUBLIC_PATHS`         | `src/lib/supabase/middleware.ts:16` already early-returns for `/api/cron/bank-sync`. Generalise that line to the `/api/cron/` prefix rather than adding a second special case.                      |
| `CRON_SECRET` is new                      | Already in `.env.example` and required in production by `bankConfig()`.                                                                                                                             |
| `vercel.json` has no crons                | It has one (`0 17 * * *`). Weekly email is a **second** entry — check the plan's cron-job allowance before assuming both are permitted.                                                             |
| Data-freshness warnings need building     | `bankWarnings()` / `bankStatus()` in `src/lib/bank/status.ts` already produce them for the recap and chat. **Reuse them**; do not write a second freshness rule.                                    |
| Migration `20260918000000`                | **Taken** by `20260918000000_anz_bank_sync.sql`. Use `20260923000000_weekly_emails.sql`.                                                                                                            |

Two content additions follow from #41 and the project handoff, both cheap because the inputs now exist:
**bank freshness / incomplete-history warnings** (via `bankWarnings`) and, once the catch-up review feature
lands, a **count of transactions needing review**. If review ships after this, leave a typed hole for the
count rather than inventing a second definition of "needs review".

### The constraint that shapes everything

`financial_snapshot(date,date)` is `security invoker` and derives the household from `auth.uid()`. A cron
request has no user, so **no existing query module can be reused as-is**. Two things follow:

1. A new `security definer` RPC, `weekly_digest_snapshot(p_household, p_from, p_to)`, returning the same
   JSON shape, with execute granted to `service_role` only — revoked from `public`, `anon` and
   `authenticated`, so it cannot become a household-boundary hole from the browser.
2. The first service-role Supabase client in this codebase (`src/lib/supabase/service.ts`). It is confined
   to the cron route; nothing under `src/app/(app)` may import it.

Once the snapshot is in hand, the digest is a pure function over it and reuses `expenseCents`,
`incomeCents` and `budgetState` — the same money rules as the dashboard, so the email can never disagree
with the app.

### Week window

A rolling 7 days ending **yesterday** in `Pacific/Auckland`, compared against the 7 days before that.
Day-agnostic: it reads correctly whether the household sends on Monday or Thursday, and it never
half-counts today.

### At-most-once sending

`households.weekly_email_last_sent_on` plus a `claim_weekly_email(p_household, p_today)` RPC that updates
and returns the _prior_ value only when the row was not already claimed today. Claim → send → on transport
failure, restore the prior value so the next day's run retries. A cron retry, a double-fire, or a manual
re-hit cannot produce two emails on one day.

### Failure posture

Per household, independently: a household whose AI note fails still gets its numbers; a household whose
send fails is logged via `console.error`, released, and does not block the others. The route answers with
`{ sent, skipped, failed }`.

A week with no transactions still sends a short "quiet week" email. Silence is indistinguishable from a
broken cron, and that is the failure mode most likely to go unnoticed for a month.

## Steps

- [ ] **Migration** `supabase/migrations/20260923000000_weekly_emails.sql`
      — `households.weekly_email_enabled boolean not null default false`
      — `households.weekly_email_day smallint not null default 1` (ISO 1=Mon…7=Sun, CHECK 1–7)
      — `households.weekly_email_last_sent_on date` (nullable)
      — `weekly_digest_snapshot(uuid, date, date)` — `security definer`, empty `search_path`,
      schema-qualified, bounded date range, `service_role` execute only
      — `households_due_for_weekly_email(p_iso_dow smallint, p_today date)` returning household id, name
      and member emails — `service_role` only
      — `claim_weekly_email(uuid, date)` / `release_weekly_email(uuid, date)` — `service_role` only
      — RLS: members may read and update the three new columns through the existing `households` policies
- [ ] **Service client** — reuse or factor out the one `src/lib/bank/sync.ts` already builds; do not add a
      second, differently-configured service client
- [ ] **Week helpers** in `src/lib/utils/week.ts` — `nzWeekdayIso(now)`, `nzWindow(now)` returning
      `{ from, to, priorFrom, priorTo }`, built on the existing `HOUSEHOLD_TIMEZONE`
- [ ] **Digest builder** `src/lib/email/weekly-digest.ts` — pure, snapshot in / `WeeklyDigest` out:
      week spend and Δ vs the prior week · month-to-date spend · income received vs expected ·
      per-category MTD actual vs standing cap with `budgetState` flags · top 5 merchants this week ·
      uncategorised count and value · transactions imported this week · `isQuietWeek`
- [ ] **AI note** `src/lib/email/weekly-note.ts` — prompt from the digest only; `generateText` with a
      ~20s `AbortSignal`; `parseWeeklyNote` validates type and length the way `parseSummary` does;
      returns `string | null`, never throws
- [ ] **Renderer** `src/lib/email/render.ts` — `{ subject, html, text }`. Table-based HTML with inline
      hex styles (email clients do not read CSS variables), Tide palette, every interpolated value
      HTML-escaped, plus a plain-text alternative and a link to `NEXT_PUBLIC_APP_URL/dashboard`
- [ ] **Transport** `src/lib/email/send.ts` — `resend` package, `RESEND_API_KEY` + `WEEKLY_EMAIL_FROM`,
      typed `{ data, error }` return, no throwing
- [ ] **Cron route** `src/app/api/cron/weekly-email/route.ts` — `runtime = 'nodejs'`,
      `dynamic = 'force-dynamic'`; timing-safe `Authorization: Bearer ${CRON_SECRET}` check;
      NZ-weekday gate; per-household claim → snapshot → digest → note → render → send → release-on-failure
- [ ] **Middleware** — generalise the existing `/api/cron/bank-sync` early return at
      `src/lib/supabase/middleware.ts:16` to the `/api/cron/` prefix, or the request is 307'd to `/login`.
      The route's bearer check is the actual gate; a comment will say so.
- [ ] **`vercel.json`** — add a **second** `crons` entry, `{ "path": "/api/cron/weekly-email",
    "schedule": "0 18 * * *" }` (06:00 NZST / 07:00 NZDT), alongside the existing bank-sync `0 17 * * *`.
      Confirm the account's cron-job allowance covers two before relying on it.
- [ ] **Server actions** in `src/lib/actions/household.ts` — `updateWeeklyEmailSettings` (validated day,
      boolean enabled) and `sendTestWeeklyEmail` (builds via the normal RLS path, mails the caller only)
- [ ] **Settings UI** `src/components/settings/WeeklyEmailCard.tsx` inside `HouseholdContent` — shadcn
      `Switch` + `Select` (controlled + hidden input, per the shadcn convention), recipient list, last-sent
      date, Save and "Send a test to me", `useActionState` + sonner toasts. Split if it passes ~150 lines.
- [ ] **Tests** `tests/weekly-email.test.cjs` + PGlite cases in `tests/database.test.cjs`
- [ ] **Docs** — ADR `docs/decisions/005-weekly-email-delivery.md`, `docs/schema/current.md`, roadmap tick,
      CLAUDE.md Current State, `.env.example`
- [ ] `pnpm test` · `pnpm lint` · `pnpm type-check` · `pnpm build`, then commit and push

## Manual test steps

- [ ] **Happy path, no waiting.** Settings → Household → enable weekly email, pick a day, Save. Click
      "Send a test to me". Expect an email within a minute whose week total, category caps and top
      merchants match the dashboard for the same window.
- [ ] **The real trigger.** `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/weekly-email` on a
      day that matches the configured weekday → `{ sent: 1 }` and mail to _both_ members. Immediately re-run
      → `{ sent: 0, skipped: 1 }` and no second email.
- [ ] **Wrong day.** Same call on a non-matching NZ weekday → `{ sent: 0 }`, nothing sent.
- [ ] **Unauthenticated.** Same URL with no header, and with a wrong secret → 401 both times, no redirect
      to `/login`, no send.
- [ ] **Edge — AI down.** Point `TIDE_ANTHROPIC_API_KEY` at a bad value and trigger. The email must still
      arrive with the full numbers and no note block. Nothing in the numbers may change.
- [ ] **Edge — transport down.** Bad `RESEND_API_KEY` and trigger. Expect `{ failed: 1 }`, a
      `console.error`, and `weekly_email_last_sent_on` **released** — the next day's run retries.
- [ ] **Edge — quiet week.** A household with no transactions in the window still receives the short
      "quiet week" email rather than silence.
- [ ] **Edge — disabled.** Toggle off; trigger on the matching day → nothing sent.
- [ ] **Edge — NZ daylight saving.** NZDT starts 27 Sep 2026. Unit tests pin `nzWeekdayIso` and `nzWindow`
      either side of the 18:00 UTC cron on that weekend, proving the send neither skips nor doubles.
- [ ] **Boundary — household isolation.** With two households enabled, each email contains only its own
      figures. Confirm `weekly_digest_snapshot` is not executable as `authenticated`.

## Out of scope for this session

- Bank feeds / ANZ connectivity and the catch-up review stage — still separate, as the reliability log says
- Per-member opt-out (household-level only this session), monthly email, digest scheduling by time of day
- Unsubscribe link and bulk-email compliance headers — this is a two-person private tool with two known
  recipients and a Settings toggle. Noted in the ADR as a deliberate deferral, not an oversight.
- Retrying a failed week later the same day, a send queue, or bounce handling
- An in-app HTML preview of the email
- Applying any migration to production, and any change to production data

---

<!-- Filled in during/after the session -->

## What actually happened

## Files created / modified

## Deferred to next session

## Status

- [x] In progress
- [ ] Complete
- [ ] Partial — see deferred
