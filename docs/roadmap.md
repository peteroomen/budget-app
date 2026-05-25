# Household Budget App — Product Roadmap

## Overview

A personal budgeting web app for two people. Core loop: import transactions → AI categorises → set budgets → chat with your data. Small, focused, genuinely useful.

**Stack:** Next.js 15 (App Router) · TypeScript · Supabase (Postgres + Auth + RLS) · shadcn/ui · Vercel · Anthropic API (Claude) · Vercel AI SDK · Assistant UI  
**Users:** Two (household/partner model, shared data)  
**Philosophy:** Ship small, use it, iterate. Defer anything that doesn't directly serve the core loop.

> **Docs & Obsidian:** This file lives at `docs/roadmap.md` in the project. The `docs/` folder is an Obsidian vault — session plans, ADRs, and schema notes all live here as markdown. Claude Code is instructed (via `CLAUDE.md`) to write a session plan before each coding session and update it on completion. Keep this roadmap up to date as phases are completed — tick off items and add notes.

---

## Data Model (Reference)

```
households
  └── id, name

users
  └── id, household_id, email

accounts
  └── id, household_id, name, institution, currency, type (checking | savings | credit)

transactions
  └── id, account_id, date, amount_cents, description (raw), merchant_name, category_id, is_recurring, notes, source (csv | pdf)

categories
  └── id, household_id, name, color, icon, is_system (bool)

merchant_category_map
  └── id, household_id, merchant_name (normalised), category_id
  -- Merchant memory: looked up before hitting Claude, updated on manual overrides

budgets
  └── id, household_id, category_id, month (YYYY-MM), amount_cents

uploads
  └── id, account_id, filename, file_type (csv | pdf), uploaded_at, row_count, status
```

---

## MVP — Phase 1: Foundation

> Goal: Two users can log in, upload a statement (CSV or PDF), and see their transactions in a clean list.

### Auth & Household

- [x] Supabase Auth (email/password — no OAuth needed yet)
- [x] `households` table + invite link so Megan can join the same household
- [x] RLS policies: users only see their household's data
- [x] Basic app shell: sidebar nav, header, shadcn theme
  - Design note: move profile/sign-out to bottom-left of sidebar (currently in header)

### Accounts

- [x] "Add account" form (name, bank/institution, type)
- [x] Account list view

### Statement Import (CSV + PDF)

- [x] Upload UI — drag & drop or file picker, accepts `.csv` and `.pdf`
- [x] **CSV path:** parse with papaparse, auto-detect bank format by headers (ANZ/ASB/Westpac/BNZ), handle format variations
  - Manual column mapping UI (for unrecognised bank formats) — deferred to Phase 5 Polish
- [x] **PDF path:** extract text with pdfjs-dist → pass raw text to Claude with a parsing prompt → Claude returns structured `{date, amount, description}[]` JSON
- [x] Normalise amounts: handle credit card sign conventions (credits positive, debits negative — consistent regardless of source)
- [x] Duplicate detection on import (same account + date + amount + description hash)
- [x] Transaction list view (sortable, filterable by account/date)

> **ANZ note:** PDF format is consistent across statements (as confirmed from real statement). CSV is available from online banking but not reliably from the mobile app — PDF is the more practical regular import path.

**Deliverable:** Can upload last month's ANZ statement (PDF or CSV) and see all transactions.

---

## Phase 2: AI Categorisation

> Goal: Every imported transaction gets a category automatically. Users can correct mistakes. Corrections are remembered forever.

### Categories

- [x] Seed a default category set: Groceries, Dining Out, Takeaways, Fuel, Transport, Utilities, Insurance, Childcare, Health, Pharmacy, Shopping, Kids, Entertainment, Subscriptions, Savings, Loan Repayments, Income, Other
- [x] Category management UI (add, rename, recolour, delete)

> **Future considerations — revisit in Phase 5**
>
> - **Unique names** ✅ Done — `UNIQUE (household_id, name)` constraint added; UI surfaces a friendly "A category with that name already exists" error.
> - **Colour vs icon — visual distinction at scale:** 18 categories is pushing the limit of what colours alone can distinguish. The `icon` column already exists in the schema (nullable text) for exactly this reason. Options: (a) expand colour presets beyond 16, (b) add icon picker using Lucide icons (already a shadcn dependency — no new packages needed), (c) emoji. Recommendation: add Lucide icon picker in Phase 5 Polish when the transaction list makes the visual density problem concrete.
> - **Editing system categories:** Currently the UI allows renaming and recolouring system (default) categories but not deleting them. Long-term: the AI categorisation prompt references category names by name, so renaming "Groceries" to something idiosyncratic could silently degrade quality. Possible middle ground: allow editing but add a **"Reset to default"** button. Also worth adding a `description` field per category (e.g. "Supermarkets, fresh food, online groceries") — useful as a UI hint and as extra context in the categorisation prompt.
> - **Revisit the default category set:** The seeded list was chosen upfront but real usage will reveal what's actually useful. Specific open questions: (a) Are "Dining Out" and "Takeaways" worth keeping as separate categories, or is one "Food & Drink" bucket simpler in practice? (b) Is "Transport" needed separately from "Fuel" for a household that mostly drives? (c) Are there NZ-specific categories missing (e.g. ACC levies, KiwiSaver top-ups)? Recommendation: after 2–3 months of real imports, review which categories are used, which are always empty, and which get merged by habit — then revise the seed migration and add a one-time "reassign" migration for existing data.

### Merchant Memory

- [x] `merchant_category_map` table — stores `normalised_merchant_name → category_id` per household
- [x] On import: normalise merchant names (uppercase, strip card numbers/dates), check map first
- [x] If found in map: apply category instantly, no Claude call needed
- [x] If not found: add to Claude batch
- [x] On manual override: update the map (so it's remembered for next import)
- [x] "Forget this mapping" option per merchant if needed

### Auto-categorisation (for unmapped merchants)

- [x] Batch Claude API call with unrecognised merchant descriptions + category list
- [x] Prompt: few-shot NZ examples + full category list → return `{description, category}[]` JSON
- [x] Store result and populate merchant map for future imports
- [x] Inline category override in transaction list
- [x] "Re-categorise all" button (clears map and reruns — useful if categories change)

### Category source indicator (refinement — build after auto-categorisation)

- [x] Add `category_source` column to `transactions` — `'claude' | 'manual'`, nullable (uncategorised)
- [x] `setCategoryOverride` sets `'manual'`; AI categorisation sets `'claude'`
- [x] Transaction list: small pencil icon next to category name when `category_source = 'manual'` — no icon for Claude-assigned, nothing for uncategorised

### Locked merchant mappings (refinement — manual overrides survive re-categorise)

> **Current behaviour:** Manual overrides via the category dropdown update `merchant_category_map` and stick for future imports. But "Re-categorise all" wipes the whole map and reruns Claude, overwriting manual choices.
>
> **Proposed fix:** Add `is_manual boolean default false` to `merchant_category_map`. `setCategoryOverride` sets `is_manual = true`; `recategoriseAll` skips rows where `is_manual = true` so locked mappings are preserved. A "reset to AI" option per merchant would clear the flag.
>
> Migration: `ALTER TABLE merchant_category_map ADD COLUMN is_manual boolean NOT NULL DEFAULT false;`

**Deliverable:** Import statement, ~90%+ of transactions categorised instantly from memory, unknowns handled by Claude. Corrections stick.

---

## Phase 3: Dashboard & Budgets

> Goal: At a glance, know how the month is tracking.

### Monthly Dashboard

- [x] Current month spending by category (bar chart or donut — shadcn Charts)
- [x] Total spent vs total income this month
- [x] Month selector (navigate back through history)
- [x] Top 5 merchants this month

### Budgets

- [x] Set a monthly budget per category (amount input, saved per month)
- [x] Budget vs actual bar for each category (green → amber → red as you approach/exceed)
- [x] "Over budget" callout cards on dashboard
- [ ] Rollover toggle (Phase 3b): unspent budget rolls to next month

### Recurring Transactions

- [x] Auto-detect recurring: same merchant + similar amount appearing monthly
- [x] Manual flag toggle on any transaction
- [x] "Fixed costs" summary card: total confirmed recurring per month (rent, ELC, loans, insurance, subscriptions)

> **Future enhancements to the Fixed Costs card — revisit in Phase 5**
>
> The current card shows a total + merchant count. Possible directions:
>
> - **Merchant breakdown list:** expand the card (or link to a panel) showing each recurring merchant with its typical amount — so you can see at a glance that it's Netflix $22.99, ELC $620, ANZ Homeloan $1,250, etc. rather than just a total.
> - **Month-over-month delta:** flag when a recurring amount changes (e.g. power bill went up $15 vs last month) — useful for catching subscription price creep.
> - **"Expected vs arrived" status:** for the current month, show which recurring payments have already hit vs which are still expected (based on historical day-of-month patterns). Helps with cash flow planning mid-month.
> - **Auto-run detection on import:** currently triggered manually; could run automatically after each CSV/PDF import.
> - **Category breakdown:** split fixed costs by category (Insurance, Subscriptions, Loans, Childcare, Utilities) so you can see the composition, not just the total.
> - **Annual projection:** fixed costs × 12 shown as a "committed annual spend" figure.

**Deliverable:** Open the app mid-month and know exactly where you stand.

---

## Phase 4: AI Chat

> Goal: Ask natural questions about your finances and get grounded, accurate answers.

### Chat Interface

- [x] Dedicated `/chat` route (or collapsible side panel — TBD)
- [x] Built with **Assistant UI** components (shadcn-compatible, sits on Vercel AI SDK)
- [x] Single conversation per session — **Clear chat** button resets it
- [x] No chat history persistence (session memory only — simpler, private)
- [x] Streaming responses via Vercel AI SDK

### Context Injection (RAG approach — no tool calls in v1)

On each message, inject into system context:

- Current month's transactions (all, with category + merchant + amount)
- Budget amounts per category + budget vs actual
- Last 3 months' category totals for trend comparison
- Recurring transactions list + total fixed costs
- Household name + current date

### System Prompt

- Budget assistant for a NZ household
- Always answers in NZD
- References specific transactions when helpful
- Honest about uncertainty (e.g. projections, future spending)
- Knows about upcoming automatic payments from statement

Example queries:

- _"Can I afford to buy a new guitar amp this month?"_
- _"How much have we spent on Chemist Warehouse this month?"_
- _"We're eating out a lot — what's the damage?"_
- _"What are our fixed costs every month?"_
- _"How does this month's groceries compare to last month?"_

**Deliverable:** Natural conversation about your finances without opening a spreadsheet.

### Chat v2 — Future Enhancements (deferred — revisit with requirements)

The chat interface is v1. Before building any of these, sit down and properly define what a great chat experience looks like for this household. Ideas captured so far:

- **Conversation hint chips** — suggested prompts shown below the input to help users discover what to ask
- **Historical data access** — current context only injects the current month; the agent needs a way to look up any month (or all-time summaries) to answer trend questions, year-to-date totals, or "how does this compare to six months ago?". Tool calls are probably the right mechanism — let Claude request the data it needs rather than injecting everything upfront
- **Tool calls** — live DB queries per message instead of a static context block
- **Rich responses** — inline charts and trend graphs rendered inside the chat thread
- **Summary cards** — structured cards for balances, budget snapshots, recurring costs
- **Write actions** — Claude adjusts budgets, recategorises transactions, or flags recurring items on request (with confirmation)
- **Account balances** — include current balances in context (requires balance tracking)

> Treat this whole section as a backlog to be shaped, not a build list.

---

## Phase 5: Polish & Quality of Life

> Goal: An app you actually want to open every month.

- [ ] **Transaction pagination** — the transaction list will get unwieldy once several months of data are loaded. Two approaches to decide between: (a) show one month at a time (month selector like the dashboard, clean mental model), or (b) traditional pagination with the existing filters still in play. Approach TBD — revisit once real data volume makes the problem concrete.
- [ ] **Import summary** — after an upload completes, show a breakdown of what happened: X transactions imported, X duplicates skipped, X categorised from merchant memory, X categorised by Claude, X flagged as recurring, X uncategorised. Becomes more useful as more AI detection runs on import (recurring, anomaly flagging, etc.). Display inline on the import page or as a modal — don't navigate away.
- [x] Monthly summary view — Claude-generated one-page recap (spend vs budget, vs prior month, notable patterns)
- [ ] In-app budget alerts: "You're 80% through Dining Out"
- [ ] Multi-account view (net position across all accounts)
- [ ] Full-text transaction search
- [ ] CSV export of filtered transactions
- [ ] Mobile-responsive polish pass
- [ ] Dark mode (trivial with shadcn)
- [ ] Persisted chat history (optional upgrade — store threads in Supabase)
- [ ] Budget page month picker enhancement — replace prev/next buttons with a richer selector: click the month label to open a shadcn Popover with a year + month grid so users can jump directly to any month rather than stepping one at a time

---

## Design Direction: Dashboard vs Summary (Unresolved)

> **Status:** Discussed 2026-05-25. No code changes made yet — captured here for the next revisit.

### The problem

With `/dashboard` and `/summary` both existing, the current split is thin:

- Dashboard: charts + numbers (any month, via selector)
- Summary: AI narrative (any month, via selector)

They tell the same story in different formats, about the same data, for the same months. Navigating between them feels redundant rather than complementary.

### Proposed redesign: purpose-driven split

**Dashboard → "This Month" (status view)**

- Always current month, no month selector
- Answers: _"How are we tracking right now?"_
- Budget progress bars: % used per category, colour-coded green/amber/red
- Days remaining in the month + projected overspend at current pace (simple linear extrapolation)
- Top merchants month-to-date
- Fixed costs / recurring confirmed this month
- Fast: pure Supabase queries, no AI call
- Rename nav item to "This Month" to make the intent obvious

**Summary → "Monthly Recap" (historical view)**

- Past months only — current month could be hidden or shown as "in progress" with a caveat
- Answers: _"How did that month go?"_
- Claude-generated narrative as it is now: headline, over-budget, vs prior month, patterns
- The AI angle makes more sense for closed months — you're reflecting, not course-correcting
- Rename nav item to "Recap" or "Monthly Recap"

### Trade-offs to weigh before building

|                                 | In favour                                                      | Against                                                  |
| ------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| Lock dashboard to current month | Clear mental model, faster load                                | Lose ability to compare chart visuals across past months |
| AI on summary only              | Appropriate framing (retrospective), no latency on status view | Current month has no AI context — chat fills that gap    |
| Rename nav items                | More honest about purpose                                      | Minor churn, users (both of them) already know the app   |

### Open questions before committing

- Do we miss the ability to look at a past month's charts (bar chart breakdown)? If yes, keep dashboard's month selector but default to current.
- Does the current month deserve an AI "how are you tracking?" card too — a lightweight version, not a full recap? That would need a different prompt framing ("you're 18 days in, on this trajectory...").
- Is the "days remaining + projected overspend" projection actually useful or just noisy? Only real usage will tell.

### Recommended next step

Use the app for 1–2 months as-is. If the duplicate-page friction is felt in practice, implement the redesign as build order item #17. If you find yourself only using one of the two pages, that's the signal.

---

## Future / Far Future

| Feature                    | Notes                                                                                                                                                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct bank API (Akahu)    | Akahu is the NZ open banking layer. Worth revisiting once PDF import friction is felt. Subscription cost involved.                                                                                                                                                                                              |
| Push / email notifications | Resend for email. Good for monthly summary delivery.                                                                                                                                                                                                                                                            |
| Axiom logging              | Only worthwhile if sharing with others or debugging production issues.                                                                                                                                                                                                                                          |
| Mobile app                 | React Native / Expo once web is solid.                                                                                                                                                                                                                                                                          |
| OAuth login                | Google/Apple login — useful if sharing with more people.                                                                                                                                                                                                                                                        |
| Multi-currency support     | Not needed for NZ household.                                                                                                                                                                                                                                                                                    |
| Unit / automated tests     | Overkill for now — worth adding Vitest for parsing and categorisation logic once the core is stable. Key targets: `lib/parsers/` (CSV format detection, normalisation), `lib/categorise.ts` (Claude response parsing), and any pure utility functions. E2E with Playwright if the app grows to have more users. |

---

## Claude Code Build Order

Suggested chunking — each is one focused Claude Code session:

1. **Project scaffold** — Next.js 15 + TS + Supabase + shadcn setup, env config, DB schema migrations
2. **Auth + household** — login page, invite link flow, RLS policies
3. **Accounts CRUD** — add/list/delete accounts UI
4. **CSV import pipeline** — upload → papaparse → normalise → store (no categorisation yet)
5. **PDF import pipeline** — upload → pdfjs text extract → Claude parse → store (reuse normalise logic)
6. **Transaction list UI** — table, sort, filter by account/date/category
7. **Category system** — seed defaults, management UI
8. **Merchant memory** — `merchant_category_map` table + lookup logic
9. **AI categorisation** — batch Claude call for unmapped merchants, map updates on override
10. **Dashboard charts** — monthly spend by category, income vs spend, month selector
11. **Budget management** — set/edit budgets, vs-actual bars
12. **Recurring detection** — auto-detect + manual flag, fixed costs card
13. **Chat interface** — Assistant UI setup, Vercel AI SDK route, streaming
14. **Chat agent** — context injection, system prompt, NZD-aware responses
15. **Monthly summary** — Claude-generated recap view
16. **Polish pass** — responsive, dark mode, edge cases, empty states
17. **Import summary** — post-upload breakdown (imported / duplicates / from map / from Claude / recurring / uncategorised)

> **Tip:** Each Claude Code session: one item from the list above + current DB schema as context. Never combine items. Smaller scope = fewer errors and easier debugging.

---

## Open Questions

- [ ] ANZ PDF column structure confirmed (yes — seen from real statement). Test Westpac/ASB PDFs if needed.
- [ ] Credit card sign convention: standardise on debits as positive spend in DB, or keep signed amounts? Decide before Phase 1.
- [ ] Default category set: use the seeded list above or customise before Phase 2?
- [ ] Chat placement: dedicated `/chat` route vs side panel — decide at Phase 4.
