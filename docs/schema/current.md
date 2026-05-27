# Current Database Schema

> Auto-maintained. Update this file after every migration.

**Migrations:** up to `20260527000001_savings_to_transfer.sql`
**Last updated:** 2026-05-27

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

| Column       | Type        | Notes                               |
| ------------ | ----------- | ----------------------------------- |
| id           | uuid (PK)   | FK → auth.users(id), cascade delete |
| household_id | uuid        | FK → households(id), nullable       |
| email        | text        | Not null                            |
| display_name | text        | Nullable                            |
| created_at   | timestamptz | Default now()                       |
| updated_at   | timestamptz | Auto-updated via trigger            |

Auto-created via trigger on `auth.users` insert.

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

---

## Enums

- `account_type`: spending, saving
- `upload_status`: pending, processing, complete, error
- `file_type`: csv, pdf

## Functions

- `handle_updated_at()` — trigger function, sets `updated_at = now()` on update
- `handle_new_user()` — trigger function, inserts a `profiles` row when `auth.users` row is created
- `get_my_household_id()` — helper for RLS policies, returns current user's household_id

## RLS

All tables have RLS enabled. Policies enforce household-level isolation via `get_my_household_id()`. Transactions and uploads are scoped through their parent account's household_id.
