# Household Budget App — Architecture & Dev Process

> **Docs & Obsidian:** This file lives at `docs/architecture.md`. The `docs/` folder is an Obsidian vault — open it as a vault in Obsidian to navigate all project documentation. Claude Code writes session plans to `docs/work/` and architecture decision records to `docs/decisions/`. See `CLAUDE.md` at the project root for Claude Code instructions.

---

## Tech Stack

| Layer           | Choice                               | Reason                                                           |
| --------------- | ------------------------------------ | ---------------------------------------------------------------- |
| Framework       | Next.js 15 (App Router)              | File-based routing, server components, API routes, Vercel-native |
| Language        | TypeScript (strict)                  | Catch errors early, better DX, required for this stack           |
| Database        | Supabase (Postgres)                  | Auth + DB + Storage + RLS in one, generous free tier             |
| Auth            | Supabase Auth                        | Built-in, handles sessions, pairs with RLS cleanly               |
| Hosting         | Vercel                               | Zero-config Next.js deploys, preview URLs per PR                 |
| UI Components   | shadcn/ui                            | Copy-owned components, Tailwind-based, highly customisable       |
| Styling         | Tailwind CSS v4                      | Utility-first, co-located with shadcn                            |
| Charts          | shadcn Charts (Recharts)             | Already in the shadcn ecosystem                                  |
| AI SDK          | Vercel AI SDK                        | Streaming, `useChat` hook, Next.js API route helpers             |
| Chat UI         | Assistant UI                         | shadcn-compatible chat components built on Vercel AI SDK         |
| AI Model        | Anthropic Claude (claude-sonnet-4-5) | Categorisation + chat + PDF parsing                              |
| CSV Parsing     | papaparse                            | Best-in-class browser/Node CSV parser                            |
| PDF Parsing     | pdfjs-dist                           | Mozilla's PDF.js — extract raw text from bank PDFs               |
| Package Manager | pnpm                                 | Faster installs, better disk usage than npm/yarn                 |
| Linting         | ESLint + Prettier                    | Code quality + consistent formatting                             |
| Pre-commit      | Husky + lint-staged                  | Enforce lint/format before every commit                          |
| Version Control | Git + GitHub                         | Standard; enables Vercel GitHub integration                      |
| CI/CD           | Vercel (auto)                        | Push to main → production deploy. PRs → preview deploy.          |
| Future CI       | GitHub Actions                       | Add later for running tests, type checks on PR                   |

---

## Repository Structure

```
budget-app/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth route group (login)
│   │   │   └── login/page.tsx
│   │   ├── (app)/                  # Protected route group
│   │   │   ├── layout.tsx          # App shell — h-screen/overflow-hidden for chat layout
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── budgets/page.tsx
│   │   │   ├── accounts/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   └── chat/page.tsx
│   │   ├── api/
│   │   │   └── chat/route.ts       # Vercel AI SDK streaming (streamText + Anthropic)
│   │   ├── auth/                   # Supabase auth callbacks (callback, confirm, set-password)
│   │   └── layout.tsx              # Root layout
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components (auto-generated, copy-owned)
│   │   ├── accounts/               # AccountCard, AddAccountDialog
│   │   ├── auth/                   # LoginForm, SignOutButton
│   │   ├── budgets/                # BudgetProgressBar, MonthPicker, OverBudgetCards, SetBudgetDialog
│   │   ├── categories/             # AddCategoryDialog, ColorPicker, DeleteCategoryButton, EditCategoryDialog
│   │   ├── chat/                   # Thread.tsx (assistant-ui primitives), ChatPanel.tsx (runtime + clear)
│   │   ├── dashboard/              # IncomeVsSpendCards, MonthSelector, SpendByCategoryChart, TopMerchantsTable
│   │   ├── import/                 # ImportForm
│   │   ├── nav/                    # NavLink
│   │   └── transactions/           # CategoryCell, DeleteAllTransactionsButton, RecategoriseButton, TransactionFilters, TransactionTable
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser Supabase client
│   │   │   ├── server.ts           # Server Supabase client (cookies)
│   │   │   └── middleware.ts       # Auth middleware
│   │   ├── actions/                # Next.js server actions (all DB writes go through here)
│   │   │   ├── auth.ts
│   │   │   ├── accounts.ts
│   │   │   ├── budgets.ts          # upsertBudget
│   │   │   ├── categories.ts
│   │   │   ├── categorise.ts       # recategoriseAll (server action wrapper)
│   │   │   ├── import.ts           # CSV/PDF upload → parse → categorise pipeline
│   │   │   ├── merchant-map.ts     # setCategoryOverride, forgetMapping
│   │   │   └── transactions.ts     # deleteAllTransactions
│   │   ├── queries/                # DB query helpers — server-only, never import from client components
│   │   │   ├── accounts.ts
│   │   │   ├── budgets.ts          # getBudgetsWithActuals
│   │   │   ├── categories.ts
│   │   │   ├── dashboard.ts        # getDashboardData (aggregations for charts)
│   │   │   ├── merchant-map.ts
│   │   │   ├── profile.ts
│   │   │   └── transactions.ts
│   │   ├── parsers/
│   │   │   ├── bank-formats.ts     # ANZ/ASB/Westpac/BNZ column mappings
│   │   │   ├── csv.ts              # papaparse + format detection + normalise
│   │   │   └── normalise.ts        # Shared normalisation (amounts, dates, merchants)
│   │   ├── categorise.ts           # Batch Claude categorisation logic (called from import pipeline)
│   │   ├── utils.ts
│   │   └── utils/
│   │       └── month.ts            # Pure date helpers: prevMonth, nextMonth, formatMonthLabel, monthDateRange
│   └── types/
│       └── index.ts                # Shared TypeScript types (Transaction, Category, Budget, etc.)
├── supabase/
│   └── migrations/             # SQL migration files (source of truth for schema)
├── test-data/                  # Sample ANZ CSV files for manual import testing
├── docs/                       # Obsidian vault — roadmap, ADRs, schema, session work logs
├── .husky/
│   └── pre-commit              # Runs lint-staged (eslint --fix + prettier --write)
├── .env.local                  # Local secrets (gitignored)
├── .env.example                # Template — committed to repo
├── eslint.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json                # Dependencies + lint-staged config
```

---

## Environment Variables

```bash
# .env.example — commit this, not .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # Server-only, never expose to client

# Anthropic
ANTHROPIC_API_KEY=               # Server-only

# App
NEXT_PUBLIC_APP_URL=             # https://your-app.vercel.app (or localhost:3000)
```

Set all production values in Vercel → Project Settings → Environment Variables.

---

## Linting & Formatting

### ESLint (`eslint.config.mjs`)

```js
// Uses Next.js recommended config + TypeScript rules
// Key rules:
// - @typescript-eslint/no-unused-vars: error
// - @typescript-eslint/no-explicit-any: error
// - no-console: warn (use structured logging in server code)
```

### Prettier (`.prettierrc`)

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

### lint-staged (inline in `package.json`)

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

---

## Husky Pre-commit Hooks

Husky runs before every `git commit`. If lint or type errors exist, the commit is blocked.

```bash
# .husky/pre-commit
npx lint-staged
```

Optional commit-msg hook (conventional commits):

```bash
# .husky/commit-msg
# Enforces: feat:, fix:, chore:, docs:, refactor: prefixes
npx --no -- commitlint --edit "$1"
```

Conventional commit examples:

```
feat: add PDF import pipeline
fix: handle ANZ credit card sign convention
chore: update dependencies
docs: add architecture doc
refactor: extract merchant normalisation to shared util
```

This keeps the git log readable and makes it easier to track what changed when debugging.

---

## Git Workflow

### Initial Setup

```bash
git init
git remote add origin https://github.com/yourusername/budget-app.git

# First commit: scaffold only (no features)
git add .
git commit -m "chore: initial project scaffold"
git push -u origin main
```

### Feature Branch Workflow (all work after initial commit)

```bash
# Start a new feature
git checkout -b feature/csv-import

# Work, commit incrementally
git add .
git commit -m "feat: add CSV upload UI"
git commit -m "feat: parse ANZ CSV format"
git commit -m "fix: handle empty rows in CSV parser"

# Push and open PR
git push origin feature/csv-import
# → Open PR on GitHub → Vercel auto-creates preview URL
# → Review in preview → Merge to main → Auto-deploys to production
```

### Branch Naming

```
feature/   → new functionality     (feature/pdf-import)
fix/       → bug fixes             (fix/duplicate-transaction-detection)
chore/     → maintenance/config    (chore/update-supabase-types)
docs/      → documentation only    (docs/update-readme)
refactor/  → restructuring         (refactor/extract-normalise-util)
```

### Rules

- **Never commit directly to `main`** after the initial scaffold commit
- Every feature = a branch + PR, even for solo work (gives you a review step + preview URL)
- Delete branches after merging (keep it tidy)
- Keep PRs small — one item from the Claude Code build order = one PR

---

## Vercel Deployment

### Auto-deploy behaviour

| Branch        | Behaviour                                              |
| ------------- | ------------------------------------------------------ |
| `main`        | Production deploy → `your-app.vercel.app`              |
| Any PR branch | Preview deploy → `your-app-git-feature-xyz.vercel.app` |

### Setup steps

1. Push repo to GitHub
2. Import project in Vercel dashboard → select repo
3. Add all env vars in Vercel → Project → Environment Variables
4. Set production/preview/development scopes per variable (ANTHROPIC_API_KEY → production + preview only)
5. Deploy

### Supabase config for preview deployments

Preview deploys can share the same Supabase project (fine for 2 users), or you can create a separate `dev` Supabase project and point preview env vars there.

---

## GitHub Actions (Add Later)

Not needed immediately — Vercel handles deploys. Add these workflows when the codebase grows:

```yaml
# .github/workflows/ci.yml (future)
name: CI
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check # tsc --noEmit
      - run: pnpm lint # eslint
      - run: pnpm test # vitest (when tests exist)
```

Trigger: add this when you start writing tests or want type-check enforcement on PRs independent of Vercel.

---

## TypeScript Configuration

```json
// tsconfig.json — key settings
{
  "compilerOptions": {
    "strict": true, // All strict checks enabled
    "noUncheckedIndexedAccess": true, // Array access returns T | undefined
    "exactOptionalPropertyTypes": true,
    "paths": {
      "@/*": ["./src/*"] // or "./*" depending on structure
    }
  }
}
```

Add `"type-check": "tsc --noEmit"` to `package.json` scripts.

---

## Supabase Local Development

```bash
# Install Supabase CLI
pnpm add -D supabase

# Start local Supabase (Docker required)
pnpm supabase start

# Generate TypeScript types from your schema
pnpm supabase gen types typescript --local > types/supabase.ts

# Create a new migration
pnpm supabase migration new add_merchant_map_table

# Apply migrations to local DB
pnpm supabase db push
```

Commit all migration files. This is your source of truth for schema.

---

## Key Technical Decisions & Rationale

**Why pnpm over npm?**  
Faster installs, hard links save disk space, stricter about undeclared dependencies. Pairs well with Vercel.

**Why Vercel AI SDK + Assistant UI vs rolling your own?**  
Vercel AI SDK handles streaming responses, abort signals, and the `useChat` hook — not trivial to implement correctly. Assistant UI gives polished shadcn-compatible chat components so you're not building message bubbles from scratch. They're designed to work together.

**Why pdfjs-dist for PDF parsing instead of a paid API?**  
The ANZ PDF format is text-based (not scanned), so pdfjs can extract the raw text reliably. Claude then structures it. No ongoing per-page API cost, no third-party data sharing.

**Why session-only chat history?**  
Simpler (no DB schema for threads), private, and sufficient for "can I afford this" style queries. Financial chat history persisted in a DB is a liability — if you want it later, it's a one-session addition.

**Why Supabase over raw Postgres/Prisma?**  
Built-in auth + RLS means row-level security is enforced at the DB layer — no risk of a missing `WHERE household_id = ?` leaking data between users. The JS client auto-attaches the user's JWT.

**Why no test suite in MVP?**  
Test coverage adds real value once the codebase stabilises. In early phases, the cost (time) outweighs the benefit for a 2-user personal tool. Add Vitest + React Testing Library at Phase 3–4 for the parsing and categorisation logic (those are the functions most likely to silently break).
