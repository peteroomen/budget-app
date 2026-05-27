-- Migration: Projected income foundation
--
-- 1. Adds `categories.type` (income | expense | transfer) with default 'expense'.
--    Backfills the seeded "Income" category to type = 'income'.
--    Transfer-type categories are NOT seeded here — they belong with the
--    later transfer-exclusion work (roadmap Phase 5 item C).
--
-- 2. Adds `households.expected_monthly_income_cents` (nullable integer) —
--    a single household-wide reference figure for budget planning and
--    AI context.

ALTER TABLE public.categories
  ADD COLUMN type text NOT NULL DEFAULT 'expense'
    CHECK (type IN ('income', 'expense', 'transfer'));

UPDATE public.categories
SET    type       = 'income',
       updated_at = now()
WHERE  name = 'Income';

ALTER TABLE public.households
  ADD COLUMN expected_monthly_income_cents integer;
