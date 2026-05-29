-- =============================================================================
-- create_household() RPC + seed_default_categories alignment with transfer
--
-- The original 20260528000000_multi_household.sql did not add an INSERT policy
-- to `households`, so the previous client-side `createHousehold` flow (insert
-- household → insert member → seed → update profile) was blocked at the very
-- first step by RLS.
--
-- Fix: collapse the whole flow into a single `security definer` SQL function.
-- It runs as the function owner, bypasses RLS for the multi-step setup, and
-- returns the new household_id. The server action becomes a thin wrapper.
-- No additional household-level RLS policies are needed.
--
-- Also: re-create `seed_default_categories` so its "Savings" entry matches
-- the migrated state from 20260527000001_savings_to_transfer.sql — i.e.
-- "Savings Transfer" with type='transfer' and the new colour. Without this
-- fix, newly-created households would diverge from existing migrated ones.
-- =============================================================================

create or replace function public.seed_default_categories(p_household_id uuid)
returns void as $$
  insert into public.categories (household_id, name, color, type, is_system)
  values
    (p_household_id, 'Groceries',          '#6E8B4F', 'expense',  true),
    (p_household_id, 'Dining & Takeaways', '#B25A6A', 'expense',  true),
    (p_household_id, 'Fuel',               '#A35044', 'expense',  true),
    (p_household_id, 'Transport',          '#B27144', 'expense',  true),
    (p_household_id, 'Utilities',          '#856F9F', 'expense',  true),
    (p_household_id, 'Housing',            '#475C7A', 'expense',  true),
    (p_household_id, 'Insurance',          '#5A8DA8', 'expense',  true),
    (p_household_id, 'Childcare',          '#B86E89', 'expense',  true),
    (p_household_id, 'Health',             '#5BA395', 'expense',  true),
    (p_household_id, 'Pharmacy',           '#6BA8A0', 'expense',  true),
    (p_household_id, 'Shopping',           '#9B6B9C', 'expense',  true),
    (p_household_id, 'Kids',               '#A38663', 'expense',  true),
    (p_household_id, 'Entertainment',      '#C49A3F', 'expense',  true),
    (p_household_id, 'Subscriptions',      '#7A85B5', 'expense',  true),
    (p_household_id, 'Savings Transfer',   '#7A8E84', 'transfer', true),
    (p_household_id, 'Loan Repayments',    '#475C7A', 'expense',  true),
    (p_household_id, 'Income',             '#5C9479', 'income',   true),
    (p_household_id, 'Other',              '#8E8780', 'expense',  true)
  on conflict do nothing;
$$ language sql security definer;

create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id      uuid := auth.uid();
  v_household_id uuid;
  v_name         text := trim(p_name);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_name is null or length(v_name) = 0 then
    raise exception 'Name is required';
  end if;

  if length(v_name) > 64 then
    raise exception 'Name must be 64 characters or fewer';
  end if;

  insert into public.households (name)
  values (v_name)
  returning id into v_household_id;

  insert into public.household_members (user_id, household_id, role)
  values (v_user_id, v_household_id, 'owner');

  perform public.seed_default_categories(v_household_id);

  update public.profiles
  set    household_id = v_household_id
  where  id = v_user_id;

  return v_household_id;
end;
$$;
