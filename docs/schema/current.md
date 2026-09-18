# Current Database Schema

> Auto-maintained. Update this file after every migration.

**Migrations:** up to `20260907000000_financial_reliability.sql` (repository schema; production deployment not verified)
**Last updated:** 2026-09-07

---

## Tables

### households

| Column                        | Type        | Notes                                                                                      |
| ----------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| id                            | uuid (PK)   | Default gen_random_uuid()                                                                  |
| name                          | text        | Not null                                                                                   |
| expected_monthly_income_cents | integer     | Nullable. Single household-wide projected monthly income used for dashboards + AI context. |
| created_at                    | timestamptz | Default now()                                                                              |
| updated_at                    | timestamptz | Auto-updated via trigger                                                                   |

### profiles

| Column       | Type        | Notes                                                                                             |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------- |
| id           | uuid (PK)   | FK → auth.users(id), cascade delete                                                               |
| household_id | uuid        | FK → households(id), nullable. **Active** household pointer (user may belong to many — see below) |
| email        | text        | Not null                                                                                          |
| display_name | text        | Nullable                                                                                          |
| created_at   | timestamptz | Default now()                                                                                     |
| updated_at   | timestamptz | Auto-updated via trigger                                                                          |

Auto-created via trigger on `auth.users` insert.

### household_members

| Column       | Type        | Notes                                          |
| ------------ | ----------- | ---------------------------------------------- |
| user_id      | uuid        | FK → auth.users(id), cascade delete            |
| household_id | uuid        | FK → households(id), cascade delete            |
| role         | text        | Default 'member'. CHECK in ('owner', 'member') |
| created_at   | timestamptz | Default now()                                  |

Primary key: `(user_id, household_id)`. A user may belong to many households; `profiles.household_id` records which one is currently active.

### accounts

| Column       | Type              | Notes                                         |
| ------------ | ----------------- | --------------------------------------------- |
| id           | uuid (PK)         | Default gen_random_uuid()                     |
| household_id | uuid              | FK → households(id), cascade delete, not null |
| name         | text              | Not null                                      |
| institution  | text              | Nullable                                      |
| currency     | text              | Default 'NZD'                                 |
| type         | account_type enum | 'spending', 'saving'                          |
| created_at   | timestamptz       | Default now()                                 |
| updated_at   | timestamptz       | Auto-updated via trigger                      |

### categories

| Column       | Type        | Notes                                                                                                                                                                                                                                 |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id           | uuid (PK)   | Default gen_random_uuid()                                                                                                                                                                                                             |
| household_id | uuid        | FK → households(id), cascade delete, not null                                                                                                                                                                                         |
| name         | text        | Not null                                                                                                                                                                                                                              |
| color        | text        | Nullable                                                                                                                                                                                                                              |
| icon         | text        | Nullable                                                                                                                                                                                                                              |
| is_system    | boolean     | Default false                                                                                                                                                                                                                         |
| type         | text        | Default 'expense'. CHECK in ('income', 'expense', 'transfer'). Income category seeded as 'income'; existing `Savings` system row renamed to `Savings Transfer` and flipped to 'transfer' by `20260527000001_savings_to_transfer.sql`. |
| created_at   | timestamptz | Default now()                                                                                                                                                                                                                         |
| updated_at   | timestamptz | Auto-updated via trigger                                                                                                                                                                                                              |

Unique constraint: `(household_id, name)`

### transactions

| Column          | Type        | Notes                                                               |
| --------------- | ----------- | ------------------------------------------------------------------- |
| id              | uuid (PK)   | Default gen_random_uuid()                                           |
| account_id      | uuid        | FK → accounts(id), cascade delete, not null                         |
| date            | date        | Not null                                                            |
| amount_cents    | integer     | Not null. Natural sign: income +, expense −                         |
| description     | text        | Not null (raw from statement)                                       |
| merchant_name   | text        | Nullable (normalised)                                               |
| category_id     | uuid        | FK → categories(id), set null on delete                             |
| category_source | text        | Nullable. 'claude' \| 'manual' \| 'map' — how category was assigned |
| is_recurring    | boolean     | Default false                                                       |
| notes           | text        | Nullable                                                            |
| source          | text        | 'csv' or 'pdf'                                                      |
| created_at      | timestamptz | Default now()                                                       |
| updated_at      | timestamptz | Auto-updated via trigger                                            |

### merchant_category_map

| Column        | Type        | Notes                                                                                       |
| ------------- | ----------- | ------------------------------------------------------------------------------------------- |
| id            | uuid (PK)   | Default gen_random_uuid()                                                                   |
| household_id  | uuid        | FK → households(id), cascade delete, not null                                               |
| merchant_name | text        | Not null (normalised)                                                                       |
| category_id   | uuid        | FK → categories(id), cascade delete, not null                                               |
| is_manual     | boolean     | Default false. True when set via manual override; prevents recategoriseAll from overwriting |
| created_at    | timestamptz | Default now()                                                                               |
| updated_at    | timestamptz | Auto-updated via trigger                                                                    |

Unique constraint: `(household_id, merchant_name)`

### budgets

| Column       | Type        | Notes                                         |
| ------------ | ----------- | --------------------------------------------- |
| id           | uuid (PK)   | Default gen_random_uuid()                     |
| household_id | uuid        | FK → households(id), cascade delete, not null |
| category_id  | uuid        | FK → categories(id), cascade delete, not null |
| amount_cents | integer     | Not null                                      |
| created_at   | timestamptz | Default now()                                 |
| updated_at   | timestamptz | Auto-updated via trigger                      |

Unique constraint: `(household_id, category_id)`

Caps are **global** — one standing value per category, applying to every month. The `month`
column was dropped in `20260831000000_global_budget_caps.sql`; the pre-collapse per-month rows
are retained in `archive.budgets_monthly` (the `archive` schema is not exposed via PostgREST).

### uploads

| Column      | Type               | Notes                                        |
| ----------- | ------------------ | -------------------------------------------- |
| id          | uuid (PK)          | Default gen_random_uuid()                    |
| account_id  | uuid               | FK → accounts(id), **nullable**              |
| filename    | text               | Not null                                     |
| file_type   | file_type enum     | 'csv' or 'pdf'                               |
| uploaded_at | timestamptz        | Default now()                                |
| row_count   | integer            | Nullable                                     |
| status      | upload_status enum | 'pending', 'processing', 'complete', 'error' |
| created_at  | timestamptz        | Default now()                                |
| updated_at  | timestamptz        | Auto-updated via trigger                     |

### import_history

| Column              | Type        | Notes                                                        |
| ------------------- | ----------- | ------------------------------------------------------------ |
| id                  | uuid (PK)   | Default gen_random_uuid()                                    |
| household_id        | uuid        | FK → households(id), cascade delete, not null                |
| account_id          | uuid        | FK → accounts(id), set null on delete, nullable              |
| filename            | text        | Not null                                                     |
| file_type           | text        | 'csv' or 'pdf', not null                                     |
| bank_format         | text        | Nullable. 'ANZ' \| 'ASB' \| 'Westpac' \| 'BNZ' \| null (pdf) |
| imported_count      | integer     | Transactions inserted. Default 0                             |
| duplicates_count    | integer     | Transactions skipped as duplicates. Default 0                |
| from_map_count      | integer     | Categorised from merchant map. Default 0                     |
| from_claude_count   | integer     | Categorised by Claude AI. Default 0                          |
| uncategorised_count | integer     | No category assigned. Default 0                              |
| imported_at         | timestamptz | Default now()                                                |
| created_at          | timestamptz | Default now()                                                |

Note: new imports write to `import_history` only. The older `uploads` table is preserved for historical records but no longer written to by new code.

---

## Enums

- `account_type`: spending, saving
- `upload_status`: pending, processing, complete, error
- `file_type`: csv, pdf

## Functions

- `handle_updated_at()` — trigger function, sets `updated_at = now()` on update
- `handle_new_user()` — trigger function, inserts a `profiles` row when `auth.users` row is created
- `get_my_household_id()` — helper for RLS policies, returns the **active** household for the current user. Validates that `profiles.household_id` is still a real membership row in `household_members`; falls back to the oldest membership if not; returns null if the user has no memberships.
- `seed_default_categories(p_household_id uuid)` — inserts the Tide default category set (system flag = true, Income → type='income', Savings Transfer → type='transfer' to match `20260527000001_savings_to_transfer.sql`, everything else → type='expense'). Callable only internally by `create_household` (execution revoked from public, anon and authenticated); safe to call repeatedly thanks to ON CONFLICT DO NOTHING.
- `create_household(p_name text)` — `security definer` RPC that atomically inserts a new household, makes the calling user its owner via `household_members`, seeds default categories, and flips `profiles.household_id` to the new id. Returns the new `uuid`. Used by the `createHousehold` server action; bypasses RLS for the multi-step setup so no `households` INSERT policy is needed.

## RLS

All tables have RLS enabled. Policies enforce household-level isolation via `get_my_household_id()` (the active household). Transactions and uploads are scoped through their parent account's household_id. `import_history` is scoped directly by `household_id`.

- `households` SELECT is broader: a user can read **any** household they belong to (powers the switcher). UPDATE on households remains scoped to the active household.
- `household_members` permits only SELECT of the current user's memberships. Membership creation is restricted to `create_household`; direct self-enrolment is forbidden. No UPDATE/DELETE policies.

## Reliability migration

- `transactions.recurring_source`: nullable text, `manual` or `detected`. All existing flags are preserved as `manual`; newly imported rows start null.
- `import_drafts`: internal table with UUID `id`, `user_id` (auth FK), `account_id` (account FK), `filename`, `file_type`, `bank_format`, `rows` JSONB, nullable `result` JSONB and `created_at`. RLS enabled; no client table grants or policies. Rows are cleared on successful commit; results support durable retries.
- `stage_import(uuid,jsonb,text,text,text)`: validates account ownership and each row, creates a one-day preview and removes the caller's abandoned previews older than two days.
- `commit_import(uuid)`: validates draft ownership and active household; locks draft/account; reconciles occurrence counts; atomically writes transactions, non-overwriting merchant memory, history and cached result.
- `financial_snapshot(date,date)`: security-invoker/RLS JSON aggregate of the active household, categories, expense caps and all transactions in a bounded date range. One MVCC snapshot, unaffected by the PostgREST result-row limit.
- `set_transaction_category(uuid,uuid)`: atomic manual category/merchant-memory update, deriving the merchant from the owned transaction. A null category is an explicit manual choice.
- `apply_automatic_categories(jsonb)`: atomically applies automatic suggestions while preserving both manual merchant mappings and manual transaction categories.
- `apply_recurring_detection(uuid[],uuid[])`: atomically writes detection results, excluding manual decisions at write time.
- Category ownership triggers enforce household consistency on transaction, budget and merchant-map writes. New budget category references must be expense categories. Account/category household IDs cannot be moved.
- Upload access requires an account in the active household. Legacy orphan uploads are no longer globally visible.
- Security-definer functions use an empty search path and schema-qualified references. Internal seed/trigger functions are not callable by clients.
- Index: `transactions(account_id,date)`.

The preceding `20260831000000_global_budget_caps.sql` migration removes `budgets.month`, archives old monthly rows to `archive.budgets_monthly`, and enforces one standing cap per `(household_id,category_id)`. Historical migration/production status must be checked before deployment.
