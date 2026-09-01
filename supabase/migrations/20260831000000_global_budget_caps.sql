-- Global budget caps: budgets are no longer per-month.
--
-- Previously `budgets` was keyed (household_id, category_id, month) and carry-forward was
-- faked by an auto-seed on the Budgets page. That seed only fired when a month had zero
-- rows, so any month holding a partial set froze there permanently — in practice July and
-- August 2026 sat on 6 stale categories while May/June carried the real 16.
--
-- A cap is now a single standing value per category, applying to every month. Spend,
-- progress bars and KPIs stay month-scoped; only the cap becomes global.

-- 1. Archive the per-month rows before collapsing.
--    `archive` is not in PostgREST's exposed-schema list, so this is unreachable with the
--    anon key and needs no RLS policy of its own. Nothing in the app reads it; it exists so
--    effective-dated caps remain possible later without data loss.
create schema if not exists archive;

create table if not exists archive.budgets_monthly as
  select * from public.budgets;

-- 2. Collapse to one row per (household_id, category_id).
--    Keep the most recently written cap, tie-breaking on the latest month it was set for.
--    Deliberately not "greatest month": months set while browsing ahead can hold older,
--    staler values than the last month actually maintained.
delete from public.budgets b
 using public.budgets b2
 where b.household_id = b2.household_id
   and b.category_id  = b2.category_id
   and (b2.updated_at, b2.month) > (b.updated_at, b.month);

-- 3. Drop the month dimension.
--    Dropping the column also drops the 3-column unique constraint and the
--    (household_id, month) index, since both involve it.
alter table public.budgets drop column month;

alter table public.budgets
  add constraint budgets_household_id_category_id_key unique (household_id, category_id);

create index idx_budgets_household on public.budgets(household_id);
