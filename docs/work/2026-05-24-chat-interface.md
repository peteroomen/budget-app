# Chat Interface

**Date:** 2026-05-24  
**Branch:** feature/chat-interface  
**Roadmap item:** Phase 4 — Chat interface (build order item #13)

## Goal

A working `/chat` page with streaming AI responses, built on Vercel AI SDK + Assistant UI. Users can type budget questions and get streamed answers. A "Clear chat" button resets the session.

## Approach

- Install `ai` (Vercel AI SDK), `@ai-sdk/anthropic` (Anthropic provider), `@assistant-ui/react` (chat UI), `@assistant-ui/react-ai-sdk` (bridge between the two).
- API route uses `streamText` from `ai` with the Anthropic provider — no direct `@anthropic-ai/sdk` calls needed for this route (Vercel AI SDK wraps it).
- Client uses `useChat` from `ai/react` wrapped in `useVercelUseChatRuntime` from `@assistant-ui/react-ai-sdk` to provide the runtime context.
- `<Thread />` from `@assistant-ui/react` renders the full chat UI (messages + input bar).
- Tailwind content config extended to include assistant-ui dist files so utility classes in the prebuilt components resolve.
- "Clear chat" calls `chat.setMessages([])` from the `useChat` return value — resets the client-side message list without a round-trip.
- System prompt is minimal for this session: "You are a helpful budget assistant for a NZ household. Always respond in NZD." Context injection is item #14.

## Steps

- [x] Write plan file
- [ ] Install `ai`, `@ai-sdk/anthropic`, `@assistant-ui/react`, `@assistant-ui/react-ai-sdk`
- [ ] Extend `tailwind.config.ts` to include `@assistant-ui/react` dist in content paths
- [ ] Create `src/app/api/chat/route.ts` — `POST` handler using `streamText` + Anthropic, returns `toDataStreamResponse()`
- [ ] Create `src/components/chat/ChatPanel.tsx` — client component: `useChat` → `useVercelUseChatRuntime` → `AssistantRuntimeProvider` + `<Thread />`
- [ ] Update `src/app/(app)/chat/page.tsx` — render heading + `<ChatPanel />`
- [ ] `pnpm lint` + `pnpm type-check`
- [ ] Commit + push + open PR

## Manual test steps

- [ ] Navigate to `/chat` — confirm page renders with chat thread UI and an input field
- [ ] Type "What is this app for?" and press Enter — confirm a streaming response appears (tokens arrive progressively)
- [ ] Type a budget-style question ("How much is $150 a week on groceries per month?") — confirm Claude answers in NZD context
- [ ] Click "Clear chat" — confirm all messages disappear and the thread resets to empty
- [ ] Start a new conversation after clearing — confirm it works normally
- [ ] Edge case: send an empty message (just whitespace) — confirm nothing is sent (useChat handles this natively)
- [ ] Edge case: send a very long message — confirm it renders and the response streams correctly

## Out of scope for this session

- Context injection (item #14) — no transaction/budget data in the prompt yet
- Persisted chat history (Phase 5)
- Side-panel layout alternative (deferred in roadmap)

---

<!-- Fill in below during/after the session -->

## What actually happened

- The `@assistant-ui/react` v0.14.7 package exports only primitives (not a prebuilt `Thread` component). Used the primitives (`ThreadPrimitive`, `MessagePrimitive`, `ComposerPrimitive`, `MessagePartPrimitive`) to compose the UI manually.
- The `@assistant-ui/react-ai-sdk` v1.3.26 API changed from `useVercelUseChatRuntime` → `useChatRuntime`, which wraps `@ai-sdk/react`'s `useChat` internally and defaults the transport to `/api/chat`.
- Vercel AI SDK v6 uses `maxOutputTokens` (not `maxTokens`) and `toUIMessageStreamResponse()` (replacing `toDataStreamResponse()`). Messages from the client are `UIMessage[]` and must be converted with `convertToModelMessages()` before passing to `streamText`.
- `useChatRuntime` takes `transport` not `api` directly — since `/api/chat` is the default endpoint, called with no args.
- Updated `src/app/(app)/layout.tsx` to use `h-screen overflow-hidden` with `overflow-y-auto` on `main`, enabling proper full-height chat panel while keeping all other pages scrollable within the main area.
- "Clear chat" works by using a `key` on `ChatSession` — incrementing it remounts the component, which creates a fresh `useChatRuntime` instance with no message history.
- `MessagePartPrimitive.Text` renders streaming text automatically with the `smooth` animation; used with `component="p"` for block layout.
- Tailwind content extended to include `@assistant-ui/react` dist so utility classes in the prebuilt primitive components resolve.

## Files created / modified

- `src/app/api/chat/route.ts` — new: POST streaming endpoint using `streamText` + Anthropic
- `src/components/chat/Thread.tsx` — new: full chat thread UI using assistant-ui primitives
- `src/components/chat/ChatPanel.tsx` — new: client component, `useChatRuntime` + `AssistantRuntimeProvider` + Clear chat
- `src/app/(app)/chat/page.tsx` — replaced stub with `ChatPanel` wrapper
- `src/app/(app)/layout.tsx` — updated to `h-screen overflow-hidden` for proper full-height layout
- `tailwind.config.ts` — added assistant-ui dist to content paths
- `package.json` / `pnpm-lock.yaml` — added `ai`, `@ai-sdk/anthropic`, `@assistant-ui/react`, `@assistant-ui/react-ai-sdk`
- `docs/work/2026-05-24-chat-interface.md` — this plan file

## Deferred to next session

- Context injection (item #14): inject current month transactions, budgets, and trends into the system prompt
- Markdown rendering in assistant messages (currently renders as plain text with whitespace-pre-wrap)

## Status

- [ ] In progress
- [x] Complete
- [ ] Partial — see deferred
