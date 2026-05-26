# ADR 002: Rename Anthropic API Key Env Var to TIDE_ANTHROPIC_API_KEY

Date: 2026-05-26  
Status: Accepted

## Context

The Anthropic API key was stored as `ANTHROPIC_API_KEY` in `.env.local`. Claude for Desktop (macOS app) injects `ANTHROPIC_API_KEY=""` (empty string) and `ANTHROPIC_BASE_URL=https://api.anthropic.com` into the macOS user environment at login.

Next.js follows the dotenv convention: if a variable is already present in `process.env`, values from `.env.local` are **not** applied — the pre-existing value wins. As a result, `process.env.ANTHROPIC_API_KEY` was always `""` inside the running Next.js dev server, causing every Anthropic API call to fail with a 401 authentication error.

This was discovered by intercepting the outbound fetch headers in the route handler and observing `"x-api-key": ""`, then confirming via `printenv` that Claude Desktop had set the variable.

## Decision

Rename the project's Anthropic API key variable to `TIDE_ANTHROPIC_API_KEY` in:

- `.env.local`
- `.env.example`
- All route handlers / server components that read it

All call sites use `createAnthropic({ apiKey: process.env.TIDE_ANTHROPIC_API_KEY! })` with an explicit `baseURL: 'https://api.anthropic.com/v1'` to avoid any dependency on the injected `ANTHROPIC_BASE_URL`.

## Consequences

- Chat and monthly summary now work correctly when Claude for Desktop is running
- The Vercel project environment must have `TIDE_ANTHROPIC_API_KEY` set (not `ANTHROPIC_API_KEY`) before production deploys
- Any future Anthropic call sites in this project must use `TIDE_ANTHROPIC_API_KEY`
- `.env.example` documents the reason so the next developer understands the naming choice
