# Current Database Schema

> Auto-maintained. Update this file after every migration.

**Migrations:** up to `20260529000000_import_history.sql`
**Last updated:** 2026-05-30

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
| month        | text        | 'YYYY-MM' format, not null                    |
| amount_cents | integer     | Not null                                      |
| created_at   | timestamptz | Default now()                                 |
| updated_at   | timestamptz | Auto-updated via trigger                      |

Unique constraint: `(household_id, category_id, month)`

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
- `seed_default_categories(p_household_id uuid)` — inserts the Tide default category set (system flag = true, Income → type='income', Savings Transfer → type='transfer' to match `20260527000001_savings_to_transfer.sql`, everything else → type='expense'). Called by `create_household`; safe to call repeatedly thanks to ON CONFLICT DO NOTHING.
- `create_household(p_name text)` — `security definer` RPC that atomically inserts a new household, makes the calling user its owner via `household_members`, seeds default categories, and flips `profiles.household_id` to the new id. Returns the new `uuid`. Used by the `createHousehold` server action; bypasses RLS for the multi-step setup so no `households` INSERT policy is needed.

## RLS

All tables have RLS enabled. Policies enforce household-level isolation via `get_my_household_id()` (the active household). Transactions and uploads are scoped through their parent account's household_id. `import_history` is scoped directly by `household_id`.

- `households` SELECT is broader: a user can read **any** household they belong to (powers the switcher). UPDATE on households remains scoped to the active household.
- `household_members` has SELECT and INSERT policies that match `user_id = auth.uid()` — users can see and insert their own membership rows. No UPDATE/DELETE policies (leave/transfer-ownership flows are out of scope for now).
