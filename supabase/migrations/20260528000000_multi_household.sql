-- =============================================================================
-- Multi-household membership
--
-- Users can belong to many households. `profiles.household_id` is repurposed
-- from "the user's only household" to "the user's currently active household"
-- — every server action already reads it to scope inserts, so keeping the
-- column avoids rewriting every call site. Membership lives in a new
-- `household_members` join table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. household_members
-- ---------------------------------------------------------------------------
create table public.household_members (
  user_id       uuid not null references auth.users(id) on delete cascade,
  household_id  uuid not null references public.households(id) on delete cascade,
  role          text not null default 'member' check (role in ('owner', 'member')),
  created_at    timestamptz not null default now(),
  primary key (user_id, household_id)
);

create index idx_household_members_user on public.household_members(user_id);
create index idx_household_members_household on public.household_members(household_id);

-- ---------------------------------------------------------------------------
-- 2. Backfill from existing profile.household_id (existing users → owners)
-- ---------------------------------------------------------------------------
insert into public.household_members (user_id, household_id, role)
select id, household_id, 'owner'
from   public.profiles
where  household_id is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3. Rewrite get_my_household_id() to validate membership
--    If profile.household_id is no longer a real membership, fall back to any
--    membership row (else null). Stops a stale pointer leaking access if a
--    user is later removed from a household.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_household_id()
returns uuid as $$
  with active as (
    select hm.household_id
    from   public.profiles p
    join   public.household_members hm
           on hm.user_id = p.id
          and hm.household_id = p.household_id
    where  p.id = auth.uid()
    limit  1
  ),
  fallback as (
    select hm.household_id
    from   public.household_members hm
    where  hm.user_id = auth.uid()
    order  by hm.created_at
    limit  1
  )
  select household_id from active
  union all
  select household_id from fallback
  limit 1;
$$ language sql security definer stable;

-- ---------------------------------------------------------------------------
-- 4. Replace households SELECT policy so a user can see every household they
--    belong to (powers the switcher). UPDATE policy is unchanged — still
--    scoped to the active household via get_my_household_id().
-- ---------------------------------------------------------------------------
drop policy if exists "Members can view household" on public.households;

create policy "Members can view their households"
  on public.households for select
  using (
    id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. RLS for household_members itself
--    Users can see their own membership rows. They can insert a row only for
--    themselves (used by createHousehold). No UPDATE / DELETE policies yet —
--    leave/transfer-ownership flows are out of scope for this migration.
-- ---------------------------------------------------------------------------
alter table public.household_members enable row level security;

create policy "Users can view own memberships"
  on public.household_members for select
  using (user_id = auth.uid());

create policy "Users can insert own memberships"
  on public.household_members for insert
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. seed_default_categories(p_household_id)
--    Single source of truth for the Tide-coloured default category list.
--    Called from createHousehold; can also be invoked from future migrations
--    that introduce new households. Income gets type='income'; everything
--    else falls back to the column's default ('expense').
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_categories(p_household_id uuid)
returns void as $$
  insert into public.categories (household_id, name, color, type, is_system)
  values
    (p_household_id, 'Groceries',          '#6E8B4F', 'expense', true),
    (p_household_id, 'Dining & Takeaways', '#B25A6A', 'expense', true),
    (p_household_id, 'Fuel',               '#A35044', 'expense', true),
    (p_household_id, 'Transport',          '#B27144', 'expense', true),
    (p_household_id, 'Utilities',          '#856F9F', 'expense', true),
    (p_household_id, 'Housing',            '#475C7A', 'expense', true),
    (p_household_id, 'Insurance',          '#5A8DA8', 'expense', true),
    (p_household_id, 'Childcare',          '#B86E89', 'expense', true),
    (p_household_id, 'Health',             '#5BA395', 'expense', true),
    (p_household_id, 'Pharmacy',           '#6BA8A0', 'expense', true),
    (p_household_id, 'Shopping',           '#9B6B9C', 'expense', true),
    (p_household_id, 'Kids',               '#A38663', 'expense', true),
    (p_household_id, 'Entertainment',      '#C49A3F', 'expense', true),
    (p_household_id, 'Subscriptions',      '#7A85B5', 'expense', true),
    (p_household_id, 'Savings',            '#4F8E6E', 'expense', true),
    (p_household_id, 'Loan Repayments',    '#475C7A', 'expense', true),
    (p_household_id, 'Income',             '#5C9479', 'income',  true),
    (p_household_id, 'Other',              '#8E8780', 'expense', true)
  on conflict do nothing;
$$ language sql security definer;
