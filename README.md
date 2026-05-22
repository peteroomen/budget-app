# Budget App

Household budgeting web app for two people. Import bank statements, AI categorises transactions, set budgets per category, chat with your data.

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Supabase (Postgres + Auth + RLS) · shadcn/ui · Tailwind CSS · Vercel AI SDK · Anthropic Claude · pnpm

## Getting Started

```bash
# Install dependencies
pnpm install

# Start local Supabase (requires Docker)
pnpm supabase start

# Copy env template and fill in values
cp .env.example .env.local

# Run dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `pnpm dev`          | Start dev server               |
| `pnpm build`        | Production build               |
| `pnpm lint`         | Run ESLint                     |
| `pnpm type-check`   | Run TypeScript type checker    |
| `pnpm format`       | Format all files with Prettier |
| `pnpm format:check` | Check formatting               |

## Docs

Project documentation lives in the `docs/` folder (also an Obsidian vault). See `CLAUDE.md` for Claude Code session instructions.
