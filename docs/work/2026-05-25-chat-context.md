# Chat Context Injection (Chat Agent)

**Date:** 2026-05-25  
**Branch:** feature/chat-context  
**Roadmap item:** Phase 4 — Chat agent / context injection (build order item #14)

## Goal

Inject real household financial data into the chat system prompt so the AI assistant can answer grounded questions about spending, budgets, and trends — without tool calls (static RAG approach).

## Approach

- Create `src/lib/queries/chat-context.ts` with a `getChatContext(month)` function that fetches all context data in parallel via Supabase, and a `formatChatContext()` helper that renders it as a compact string block.
- Update `src/app/api/chat/route.ts` to call `getChatContext()` on every request, inject the formatted block into the system prompt, and expand the system prompt copy.
- No new DB migrations needed — all required data already exists in the schema.
- Context is fetched server-side using the existing `createClient()` pattern (reads cookies from the request, so RLS applies automatically — household isolation is enforced).
- Keep context token-efficient: use `DATE | MERCHANT | CATEGORY | AMOUNT` row format for transactions, omit raw descriptions entirely.
- Trend data: one query for the 3 prior months' transactions, aggregated in memory.
- Recurring: query `is_recurring = true` transactions from current month.

## Steps

- [x] Write plan file
- [ ] Create `src/lib/queries/chat-context.ts`
  - `getChatContext(month: string): Promise<ChatContext>` — parallel fetches: profile → household, current month transactions, budgets, trend rows (3 prior months), recurring transactions
  - `formatChatContext(ctx: ChatContext): string` — renders structured text block
- [ ] Update `src/app/api/chat/route.ts`
  - Call `getChatContext(currentMonth())` at request time
  - Inject `formatChatContext(ctx)` into expanded system prompt
  - Expand system prompt: household name, NZD, honesty about uncertainty, reference to specific transactions

## Manual test steps

Happy path:

- [ ] Navigate to `/chat` — page loads with no errors
- [ ] Ask "What did we spend on groceries this month?" — expect Claude to reference actual grocery transactions from the household
- [ ] Ask "How are we tracking against budget for dining out?" — expect actual budget vs spent figures
- [ ] Ask "What are our fixed costs each month?" — expect recurring transaction list
- [ ] Ask "How does this month's spending compare to last month?" — expect trend comparison using real data

Edge cases:

- [ ] Ask a question with no transactions yet for that category — expect honest "no data" answer, not fabricated figures
- [ ] Ask a forward-looking question ("can we afford X?") — expect Claude to be honest about uncertainty

## Out of scope for this session

- Recurring detection logic (#12) — `is_recurring` flag exists; auto-detection not built yet
- Tool calls / live DB lookups per message (Phase 4 v2 / future)
- Chat history persistence (Phase 5)

---

<!-- Fill in below during/after the session -->

## What actually happened

- Followed the planned approach exactly — no major surprises.
- `getChatContext()` runs 5 parallel Supabase queries: household name, current month transactions, budgets, 3-month trend transactions, recurring transactions.
- Trend data is fetched in one query covering 3 prior months, then aggregated in memory by month + category (avoids 3 separate queries).
- Recurring: queries `is_recurring = true` for current month only; deduplicated by merchant name in memory in case of split charges.
- `formatChatContext()` renders a compact `<financial_data>` XML block: transactions as pipe-delimited rows, budget vs actual with over/under status, trend table, recurring list with total.
- `firstDayOfNextMonth()` helper was removed — it was written but lint caught it as unused (the month utilities already cover what was needed).
- If the user is unauthenticated or has no household, `getChatContext()` returns `null` and the route falls back to the base system prompt gracefully.
- Route re-exports `currentMonth` from the queries module so import is clean.

## Files created / modified

- `src/lib/queries/chat-context.ts` — new: `getChatContext()`, `formatChatContext()`, and re-export of `currentMonth`
- `src/app/api/chat/route.ts` — updated: calls `getChatContext(currentMonth())`, injects formatted block into expanded system prompt
- `docs/work/2026-05-25-chat-context.md` — this plan file

## Deferred to next session

- #12 Recurring detection — the `is_recurring` flag is used here (recurring transactions appear in context) but auto-detection logic is not yet built; transactions must be manually flagged
- #15 Monthly summary — Claude-generated recap page (Phase 5)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
