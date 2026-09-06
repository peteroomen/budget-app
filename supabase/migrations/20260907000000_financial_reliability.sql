-- Reliability foundation. Apply after 20260831000000, then deploy matching code.
-- No transaction deletion or automatic recategorisation of historical data.
begin;

-- Membership is granted by create_household (or a future invitation RPC), never self-enrolment.
drop policy if exists "Users can insert own memberships" on public.household_members;
revoke all on function public.seed_default_categories(uuid) from public, anon, authenticated;
alter function public.seed_default_categories(uuid) set search_path = '';
alter function public.create_household(text) set search_path = '';
alter function public.get_my_household_id() set search_path = '';
alter function public.handle_new_user() set search_path = '';
revoke all on function public.create_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;

-- Null-account legacy uploads are not owned by every user.
drop policy "Household members can view uploads" on public.uploads;
drop policy "Household members can insert uploads" on public.uploads;
drop policy "Household members can update uploads" on public.uploads;
create policy "Owned uploads" on public.uploads for all to authenticated
using (account_id in (select id from public.accounts where household_id = public.get_my_household_id()))
with check (account_id in (select id from public.accounts where household_id = public.get_my_household_id()));

-- Foreign keys alone do not establish that referenced categories have the same owner.
create function public.check_category_household() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_household uuid;
begin
  if new.category_id is null then return new; end if;
  if tg_table_name = 'transactions' then
    select household_id into v_household from public.accounts where id = new.account_id;
  else
    v_household := new.household_id;
  end if;
  if not exists (select 1 from public.categories where id = new.category_id and household_id = v_household) then
    raise exception 'Category does not belong to this household';
  end if;
  if tg_table_name = 'budgets' and not exists (
    select 1 from public.categories where id = new.category_id and type = 'expense'
  ) then raise exception 'Only expense categories can have budgets'; end if;
  return new;
end $$;
revoke all on function public.check_category_household() from public, anon, authenticated;
create trigger transaction_category_household before insert or update of account_id, category_id on public.transactions
for each row execute function public.check_category_household();
create trigger budget_category_household before insert or update of household_id, category_id on public.budgets
for each row execute function public.check_category_household();
create trigger mapping_category_household before insert or update of household_id, category_id on public.merchant_category_map
for each row execute function public.check_category_household();

-- Moving an account/category to a different household could invalidate existing references.
create function public.prevent_household_move() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.household_id is distinct from old.household_id then
    raise exception 'Moving accounts or categories between households is not supported';
  end if;
  return new;
end $$;
create trigger account_household_immutable before update of household_id on public.accounts
for each row execute function public.prevent_household_move();
create trigger category_household_immutable before update of household_id on public.categories
for each row execute function public.prevent_household_move();

-- Preserve all existing recurring decisions conservatively: their provenance is unknown.
alter table public.transactions add column recurring_source text
  check (recurring_source in ('manual', 'detected'));
update public.transactions set recurring_source = 'manual';

-- Internal, immutable previews. Clients confirm an ID, never supply commit rows or statistics.
create table public.import_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  filename text not null,
  file_type text not null check (file_type in ('csv', 'pdf')),
  bank_format text,
  rows jsonb not null,
  result jsonb,
  created_at timestamptz not null default now()
);
alter table public.import_drafts enable row level security;
revoke all on public.import_drafts from anon, authenticated;

create function public.stage_import(p_account uuid, p_rows jsonb, p_filename text, p_file_type text, p_format text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_household uuid; r jsonb; v_id uuid;
begin
  v_household := public.get_my_household_id();
  if auth.uid() is null or not exists (select 1 from public.accounts where id = p_account and household_id = v_household) then
    raise exception 'Account not found';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Invalid import'; end if;
  if jsonb_array_length(p_rows) not between 1 and 3000 or p_filename is null or length(p_filename) not between 1 and 255
     or p_file_type is null or p_file_type not in ('csv','pdf') then raise exception 'Invalid import'; end if;
  for r in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(r->'date') is distinct from 'string' or (r->>'date') !~ '^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$'
       or to_char((r->>'date')::date, 'YYYY-MM-DD') <> r->>'date'
       or jsonb_typeof(r->'amountCents') is distinct from 'number'
       or (r->>'amountCents') !~ '^-?[0-9]+$'
       or abs((r->>'amountCents')::numeric) > 2147483647
       or jsonb_typeof(r->'description') is distinct from 'string'
       or length(trim(r->>'description')) not between 1 and 2000
       or (r->>'source') is distinct from p_file_type then raise exception 'Invalid transaction'; end if;
    if r->>'merchantName' is not null and (jsonb_typeof(r->'merchantName') <> 'string' or length(r->>'merchantName') not between 1 and 2000) then raise exception 'Invalid merchant'; end if;
    if (r->>'categoryId' is null) <> (r->>'categorySource' is null) then raise exception 'Invalid category source'; end if;
    if r->>'categoryId' is not null and not exists (
      select 1 from public.categories where id = (r->>'categoryId')::uuid and household_id = v_household
    ) then raise exception 'Category does not belong to this household'; end if;
    if r->>'categorySource' is not null and r->>'categorySource' not in ('map','claude') then
      raise exception 'Invalid category source';
    end if;
  end loop;
  delete from public.import_drafts where user_id = auth.uid() and result is null and created_at < now() - interval '2 days';
  insert into public.import_drafts(user_id, account_id, filename, file_type, bank_format, rows)
  values (auth.uid(), p_account, p_filename, p_file_type, left(p_format, 32), p_rows) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.stage_import(uuid,jsonb,text,text,text) from public, anon;
grant execute on function public.stage_import(uuid,jsonb,text,text,text) to authenticated;

create function public.commit_import(p_draft uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d public.import_drafts; v_household uuid; r record; v_category uuid; v_source text;
  v_new integer := 0; v_map integer := 0; v_claude integer := 0; v_none integer := 0; v_result jsonb;
begin
  select * into d from public.import_drafts where id = p_draft and user_id = auth.uid() for update;
  if not found then raise exception 'Import preview not found; analyse the file again'; end if;
  v_household := public.get_my_household_id();
  -- Serialises different previews for the same account as well as identical retries.
  perform 1 from public.accounts where id = d.account_id and household_id = v_household for update;
  if not found then raise exception 'Switch back to the household where this import was analysed'; end if;
  if d.result is not null then return d.result; end if;
  if d.created_at < now() - interval '1 day' then raise exception 'Import preview expired; analyse the file again'; end if;

  -- Compare occurrence counts, preserving two identical purchases present in one file.
  for r in
    with incoming as (
      select value as tx, row_number() over (partition by value->>'date', value->>'amountCents', value->>'description' order by ordinality) as occurrence
      from jsonb_array_elements(d.rows) with ordinality
    )
    select tx from incoming i where occurrence > (
      select count(*) from public.transactions t where t.account_id = d.account_id
        and t.date = (i.tx->>'date')::date and t.amount_cents = (i.tx->>'amountCents')::integer
        and t.description = i.tx->>'description'
    )
  loop
    v_category := null; v_source := null;
    -- Resolve the current mapping at commit time; a human correction wins over an old preview.
    select m.category_id, 'map' into v_category, v_source from public.merchant_category_map m
      where m.household_id = v_household and m.merchant_name = r.tx->>'merchantName';
    if v_category is null then
      select c.id, r.tx->>'categorySource' into v_category, v_source from public.categories c
      where c.id = (r.tx->>'categoryId')::uuid and c.household_id = v_household;
    end if;
    insert into public.transactions(account_id,date,amount_cents,description,merchant_name,category_id,category_source,source)
    values(d.account_id,(r.tx->>'date')::date,(r.tx->>'amountCents')::integer,r.tx->>'description',r.tx->>'merchantName',v_category,v_source,d.file_type);
    if v_category is not null and nullif(r.tx->>'merchantName','') is not null then
      insert into public.merchant_category_map(household_id,merchant_name,category_id,is_manual)
      values(v_household,r.tx->>'merchantName',v_category,false)
      on conflict (household_id,merchant_name) do nothing;
    end if;
    v_new := v_new + 1;
    if v_source = 'map' then v_map := v_map + 1;
    elsif v_source = 'claude' then v_claude := v_claude + 1;
    else v_none := v_none + 1; end if;
  end loop;
  v_result := jsonb_build_object('newCount',v_new,'duplicates',jsonb_array_length(d.rows)-v_new,
    'fromMap',v_map,'fromClaude',v_claude,'uncategorised',v_none);
  insert into public.import_history(household_id,account_id,filename,file_type,bank_format,imported_count,duplicates_count,from_map_count,from_claude_count,uncategorised_count)
  values(v_household,d.account_id,d.filename,d.file_type,d.bank_format,v_new,jsonb_array_length(d.rows)-v_new,v_map,v_claude,v_none);
  update public.import_drafts set result = v_result, rows = '[]'::jsonb where id = d.id;
  return v_result;
end $$;
revoke all on function public.commit_import(uuid) from public, anon;
grant execute on function public.commit_import(uuid) to authenticated;

-- One MVCC snapshot returns all matching activity, categories and standing expense caps.
-- security invoker retains table RLS; explicit household filters also document the boundary.
create function public.financial_snapshot(p_from date, p_to date) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_household uuid; v_result jsonb;
begin
  v_household := public.get_my_household_id();
  if auth.uid() is null or v_household is null then raise exception 'No active household'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 1461 then raise exception 'Invalid date range'; end if;
  select jsonb_build_object(
    'household', (select to_jsonb(h) from public.households h where h.id = v_household),
    'categories', coalesce((select jsonb_agg(c order by c.name) from public.categories c where c.household_id = v_household), '[]'::jsonb),
    'budgets', coalesce((select jsonb_agg(b) from public.budgets b join public.categories c on c.id=b.category_id
      where b.household_id = v_household and c.household_id = v_household and c.type='expense'), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t) || jsonb_build_object('category',
      case when c.id is null then null else jsonb_build_object('name',c.name,'color',c.color,'type',c.type) end) order by t.date desc,t.id)
      from public.transactions t join public.accounts a on a.id=t.account_id
      left join public.categories c on c.id=t.category_id and c.household_id=v_household
      where a.household_id=v_household and t.date between p_from and p_to), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;
revoke all on function public.financial_snapshot(date,date) from public, anon;
grant execute on function public.financial_snapshot(date,date) to authenticated;

create index idx_transactions_account_date on public.transactions(account_id,date);
-- Human edits and their merchant memory commit together. Merchant is derived from the owned row.
create function public.set_transaction_category(p_id uuid, p_category uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_household uuid := public.get_my_household_id(); v_merchant text;
begin
  if v_household is null then raise exception 'No active household'; end if;
  select t.merchant_name into v_merchant from public.transactions t join public.accounts a on a.id=t.account_id
    where t.id=p_id and a.household_id=v_household for update of t;
  if not found then raise exception 'Transaction not found'; end if;
  update public.transactions set category_id=p_category, category_source='manual' where id=p_id;
  if p_category is not null and v_merchant is not null then
    insert into public.merchant_category_map(household_id,merchant_name,category_id,is_manual)
    values(v_household,v_merchant,p_category,true)
    on conflict(household_id,merchant_name) do update set category_id=excluded.category_id,is_manual=true;
  end if;
end $$;
revoke all on function public.set_transaction_category(uuid,uuid) from public, anon;
grant execute on function public.set_transaction_category(uuid,uuid) to authenticated;

create function public.apply_automatic_categories(p_mappings jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_household uuid := public.get_my_household_id(); r jsonb; v_category uuid; v_count integer; v_total integer := 0;
begin
  if v_household is null or jsonb_typeof(p_mappings) is distinct from 'array' then raise exception 'Invalid request'; end if;
  for r in select value from jsonb_array_elements(p_mappings) order by value->>'merchant' loop
    if length(r->>'merchant') not between 1 and 2000 then raise exception 'Invalid merchant'; end if;
    v_category := (r->>'categoryId')::uuid;
    insert into public.merchant_category_map(household_id,merchant_name,category_id,is_manual)
    values(v_household,r->>'merchant',v_category,false)
    on conflict(household_id,merchant_name) do update set category_id=excluded.category_id
      where not merchant_category_map.is_manual;
    if not found then continue; end if;
    update public.transactions t set category_id=v_category, category_source='claude'
      where t.account_id in (select id from public.accounts where household_id=v_household)
        and t.merchant_name=r->>'merchant' and t.category_source is distinct from 'manual';
    get diagnostics v_count = row_count;
    v_total := v_total + v_count;
  end loop;
  return v_total;
end $$;
revoke all on function public.apply_automatic_categories(jsonb) from public, anon;
grant execute on function public.apply_automatic_categories(jsonb) to authenticated;

-- Recheck provenance at write time so a manual toggle during detection cannot be lost.
create function public.apply_recurring_detection(p_recurring uuid[], p_not_recurring uuid[]) returns integer
language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  update public.transactions set is_recurring=true, recurring_source='detected'
    where id=any(p_recurring) and recurring_source is distinct from 'manual';
  get diagnostics v_count = row_count;
  update public.transactions set is_recurring=false, recurring_source='detected'
    where id=any(p_not_recurring) and recurring_source is distinct from 'manual';
  return v_count;
end $$;
revoke all on function public.apply_recurring_detection(uuid[],uuid[]) from public, anon;
grant execute on function public.apply_recurring_detection(uuid[],uuid[]) to authenticated;

commit;
