-- =============================================================================
-- Initial schema for Household Budget App
-- Convention: amounts stored as integer cents (amount_cents). Natural sign:
--   income/credits = positive, expenses/debits = negative.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. households
-- ---------------------------------------------------------------------------
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. profiles (public mirror of auth.users, linked to a household)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  household_id  uuid references public.households(id) on delete set null,
  email         text not null,
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. accounts (bank accounts / credit cards per household)
-- ---------------------------------------------------------------------------
create type public.account_type as enum ('checking', 'savings', 'credit');

create table public.accounts (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null,
  institution   text,
  currency      text not null default 'NZD',
  type          public.account_type not null default 'checking',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null,
  color         text,
  icon          text,
  is_system     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. transactions
-- ---------------------------------------------------------------------------
create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  date          date not null,
  amount_cents  integer not null,
  description   text not null,
  merchant_name text,
  category_id   uuid references public.categories(id) on delete set null,
  is_recurring  boolean not null default false,
  notes         text,
  source        text check (source in ('csv', 'pdf')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. merchant_category_map (merchant memory per household)
-- ---------------------------------------------------------------------------
create table public.merchant_category_map (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  merchant_name   text not null,
  category_id     uuid not null references public.categories(id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (household_id, merchant_name)
);

-- ---------------------------------------------------------------------------
-- 7. budgets (per category per month)
-- ---------------------------------------------------------------------------
create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  month         text not null,  -- YYYY-MM format
  amount_cents  integer not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (household_id, category_id, month)
);

-- ---------------------------------------------------------------------------
-- 8. uploads (import tracking — account_id nullable for deferred assignment)
-- ---------------------------------------------------------------------------
create type public.upload_status as enum ('pending', 'processing', 'complete', 'error');
create type public.file_type as enum ('csv', 'pdf');

create table public.uploads (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid references public.accounts(id) on delete set null,
  filename    text not null,
  file_type   public.file_type not null,
  uploaded_at timestamptz not null default now(),
  row_count   integer,
  status      public.upload_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =============================================================================
-- Auto-update updated_at trigger
-- =============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables
create trigger set_updated_at before update on public.households
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.accounts
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.categories
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.transactions
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.merchant_category_map
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.budgets
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.uploads
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- Auto-create profile on auth.users insert
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.merchant_category_map enable row level security;
alter table public.budgets enable row level security;
alter table public.uploads enable row level security;

-- Helper: get the current user's household_id
create or replace function public.get_my_household_id()
returns uuid as $$
  select household_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Households: members can view their household
create policy "Members can view household"
  on public.households for select
  using (id = public.get_my_household_id());

create policy "Members can update household"
  on public.households for update
  using (id = public.get_my_household_id());

-- Accounts: household members only
create policy "Household members can view accounts"
  on public.accounts for select
  using (household_id = public.get_my_household_id());

create policy "Household members can insert accounts"
  on public.accounts for insert
  with check (household_id = public.get_my_household_id());

create policy "Household members can update accounts"
  on public.accounts for update
  using (household_id = public.get_my_household_id());

create policy "Household members can delete accounts"
  on public.accounts for delete
  using (household_id = public.get_my_household_id());

-- Categories: household members only
create policy "Household members can view categories"
  on public.categories for select
  using (household_id = public.get_my_household_id());

create policy "Household members can insert categories"
  on public.categories for insert
  with check (household_id = public.get_my_household_id());

create policy "Household members can update categories"
  on public.categories for update
  using (household_id = public.get_my_household_id());

create policy "Household members can delete categories"
  on public.categories for delete
  using (household_id = public.get_my_household_id());

-- Transactions: via account → household
create policy "Household members can view transactions"
  on public.transactions for select
  using (
    account_id in (
      select id from public.accounts where household_id = public.get_my_household_id()
    )
  );

create policy "Household members can insert transactions"
  on public.transactions for insert
  with check (
    account_id in (
      select id from public.accounts where household_id = public.get_my_household_id()
    )
  );

create policy "Household members can update transactions"
  on public.transactions for update
  using (
    account_id in (
      select id from public.accounts where household_id = public.get_my_household_id()
    )
  );

create policy "Household members can delete transactions"
  on public.transactions for delete
  using (
    account_id in (
      select id from public.accounts where household_id = public.get_my_household_id()
    )
  );

-- Merchant category map: household members only
create policy "Household members can view merchant map"
  on public.merchant_category_map for select
  using (household_id = public.get_my_household_id());

create policy "Household members can insert merchant map"
  on public.merchant_category_map for insert
  with check (household_id = public.get_my_household_id());

create policy "Household members can update merchant map"
  on public.merchant_category_map for update
  using (household_id = public.get_my_household_id());

create policy "Household members can delete merchant map"
  on public.merchant_category_map for delete
  using (household_id = public.get_my_household_id());

-- Budgets: household members only
create policy "Household members can view budgets"
  on public.budgets for select
  using (household_id = public.get_my_household_id());

create policy "Household members can insert budgets"
  on public.budgets for insert
  with check (household_id = public.get_my_household_id());

create policy "Household members can update budgets"
  on public.budgets for update
  using (household_id = public.get_my_household_id());

create policy "Household members can delete budgets"
  on public.budgets for delete
  using (household_id = public.get_my_household_id());

-- Uploads: via account → household (account_id can be null, so also allow if null)
create policy "Household members can view uploads"
  on public.uploads for select
  using (
    account_id is null
    or account_id in (
      select id from public.accounts where household_id = public.get_my_household_id()
    )
  );

create policy "Household members can insert uploads"
  on public.uploads for insert
  with check (
    account_id is null
    or account_id in (
      select id from public.accounts where household_id = public.get_my_household_id()
    )
  );

create policy "Household members can update uploads"
  on public.uploads for update
  using (
    account_id is null
    or account_id in (
      select id from public.accounts where household_id = public.get_my_household_id()
    )
  );

-- =============================================================================
-- Indexes for common queries
-- =============================================================================
create index idx_profiles_household on public.profiles(household_id);
create index idx_accounts_household on public.accounts(household_id);
create index idx_transactions_account on public.transactions(account_id);
create index idx_transactions_date on public.transactions(date);
create index idx_transactions_category on public.transactions(category_id);
create index idx_categories_household on public.categories(household_id);
create index idx_merchant_map_household on public.merchant_category_map(household_id);
create index idx_merchant_map_lookup on public.merchant_category_map(household_id, merchant_name);
create index idx_budgets_household_month on public.budgets(household_id, month);
create index idx_uploads_account on public.uploads(account_id);
