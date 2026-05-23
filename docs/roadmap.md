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

- [ ] Supabase Auth (email/password — no OAuth needed yet)
- [ ] `households` table + invite link so Megan can join the same household
- [ ] RLS policies: users only see their household's data
- [ ] Basic app shell: sidebar nav, header, shadcn theme
  - Design note: move profile/sign-out to bottom-left of sidebar (currently in header)

### Accounts

- [ ] "Add account" form (name, bank/institution, type)
- [ ] Account list view

### Statement Import (CSV + PDF)

- [ ] Upload UI — drag & drop or file picker, accepts `.csv` and `.pdf`
- [ ] **CSV path:** parse with papaparse, auto-detect bank format by headers (ANZ/ASB/Westpac/BNZ), handle format variations
  - Manual column mapping UI (for unrecognised bank formats) — deferred to Phase 5 Polish
- [ ] **PDF path:** extract text with pdfjs-dist → pass raw text to Claude with a parsing prompt → Claude returns structured `{date, amount, description}[]` JSON
- [ ] Normalise amounts: handle credit card sign conventions (credits positive, debits negative — consistent regardless of source)
- [ ] Duplicate detection on import (same account + date + amount + description hash)
- [ ] Transaction list view (sortable, filterable by account/date)

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

### Merchant Memory

> **⬅ Next up** (build order item #8)

- [ ] `merchant_category_map` table — stores `normalised_merchant_name → category_id` per household
- [ ] On import: normalise merchant names (uppercase, strip card numbers/dates), check map first
- [ ] If found in map: apply category instantly, no Claude call needed
- [ ] If not found: add to Claude batch
- [ ] On manual override: update the map (so it's remembered for next import)
- [ ] "Forget this mapping" option per merchant if needed

### Auto-categorisation (for unmapped merchants)

- [ ] Batch Claude API call with unrecognised merchant descriptions + category list
- [ ] Prompt: few-shot NZ examples + full category list → return `{description, category}[]` JSON
- [ ] Store result and populate merchant map for future imports
- [ ] Inline category override in transaction list
- [ ] "Re-categorise all" button (clears map and reruns — useful if categories change)

**Deliverable:** Import statement, ~90%+ of transactions categorised instantly from memory, unknowns handled by Claude. Corrections stick.

---

## Phase 3: Dashboard & Budgets

> Goal: At a glance, know how the month is tracking.

### Monthly Dashboard

- [ ] Current month spending by category (bar chart or donut — shadcn Charts)
- [ ] Total spent vs total income this month
- [ ] Month selector (navigate back through history)
- [ ] Top 5 merchants this month

### Budgets

- [ ] Set a monthly budget per category (amount input, saved per month)
- [ ] Budget vs actual bar for each category (green → amber → red as you approach/exceed)
- [ ] "Over budget" callout cards on dashboard
- [ ] Rollover toggle (Phase 3b): unspent budget rolls to next month

### Recurring Transactions

- [ ] Auto-detect recurring: same merchant + similar amount appearing monthly
- [ ] Manual flag toggle on any transaction
- [ ] "Fixed costs" summary card: total confirmed recurring per month (rent, ELC, loans, insurance, subscriptions)

**Deliverable:** Open the app mid-month and know exactly where you stand.

---

## Phase 4: AI Chat

> Goal: Ask natural questions about your finances and get grounded, accurate answers.

### Chat Interface

- [ ] Dedicated `/chat` route (or collapsible side panel — TBD)
- [ ] Built with **Assistant UI** components (shadcn-compatible, sits on Vercel AI SDK)
- [ ] Single conversation per session — **Clear chat** button resets it
- [ ] No chat history persistence (session memory only — simpler, private)
- [ ] Streaming responses via Vercel AI SDK

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

---

## Phase 5: Polish & Quality of Life

> Goal: An app you actually want to open every month.

- [ ] Monthly summary view — Claude-generated one-page recap (spend vs budget, vs prior month, notable patterns)
- [ ] In-app budget alerts: "You're 80% through Dining Out"
- [ ] Multi-account view (net position across all accounts)
- [ ] Full-text transaction search
- [ ] CSV export of filtered transactions
- [ ] Mobile-responsive polish pass
- [ ] Dark mode (trivial with shadcn)
- [ ] Persisted chat history (optional upgrade — store threads in Supabase)

---

## Future / Far Future

| Feature                    | Notes                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Direct bank API (Akahu)    | Akahu is the NZ open banking layer. Worth revisiting once PDF import friction is felt. Subscription cost involved. |
| Push / email notifications | Resend for email. Good for monthly summary delivery.                                                               |
| Axiom logging              | Only worthwhile if sharing with others or debugging production issues.                                             |
| Mobile app                 | React Native / Expo once web is solid.                                                                             |
| OAuth login                | Google/Apple login — useful if sharing with more people.                                                           |
| Multi-currency support     | Not needed for NZ household.                                                                                       |

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

> **Tip:** Each Claude Code session: one item from the list above + current DB schema as context. Never combine items. Smaller scope = fewer errors and easier debugging.

---

## Open Questions

- [ ] ANZ PDF column structure confirmed (yes — seen from real statement). Test Westpac/ASB PDFs if needed.
- [ ] Credit card sign convention: standardise on debits as positive spend in DB, or keep signed amounts? Decide before Phase 1.
- [ ] Default category set: use the seeded list above or customise before Phase 2?
- [ ] Chat placement: dedicated `/chat` route vs side panel — decide at Phase 4.
