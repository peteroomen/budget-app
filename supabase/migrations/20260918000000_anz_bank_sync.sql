begin;

alter table public.transactions drop constraint transactions_source_check;
alter table public.transactions add constraint transactions_source_check check (source in ('csv','pdf','bank'));
alter table public.transactions add column bank_removed_at timestamptz;
alter table public.transactions add column bank_revision integer not null default 0;
alter table public.transactions add column bank_changed_at timestamptz;

create table public.bank_links (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null unique references public.accounts(id) on delete cascade,
 household_id uuid not null references public.households(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 provider_user_id text not null, provider_account_id text not null unique,
 name text not null, enabled boolean not null default true,
 cutover_date date not null, history_cursor date not null,
 last_success_at timestamptz, refreshed_at timestamptz, last_recent_date date,
 recent_refreshed_at timestamptz, initial_history_complete boolean not null default false,
 sync_pending boolean not null default false, last_attempt_at timestamptz,
 error_code text, created_at timestamptz not null default now()
);
create table public.bank_sync_runs (
 id uuid primary key default gen_random_uuid(), link_id uuid not null references public.bank_links(id) on delete cascade,
 kind text not null check(kind in ('recent','history')),
 date_from date not null, date_to date not null,
 refreshed_at timestamptz not null, cursor text, cursors text[] not null default '{}',
 pages integer not null default 0, complete_pages boolean not null default false,
 state text not null default 'fetching' check(state in ('fetching','complete','abandoned')),
 lease uuid, lease_until timestamptz, result jsonb,
 created_at timestamptz not null default now(), finished_at timestamptz
);
create unique index bank_one_active_run on public.bank_sync_runs(link_id,kind) where state='fetching';
create table public.bank_sync_items (
 run_id uuid not null references public.bank_sync_runs(id) on delete cascade,
 provider_id text not null, payload jsonb not null, primary key(run_id,provider_id)
);
create table public.bank_records (
 link_id uuid not null references public.bank_links(id) on delete cascade,
 provider_id text not null,
 transaction_id uuid unique references public.transactions(id) on delete set null,
 payload jsonb not null, provider_seen_at timestamptz not null,
 removed_at timestamptz, hidden_at timestamptz,
 primary key(link_id,provider_id)
);

alter table public.bank_links enable row level security;
alter table public.bank_sync_runs enable row level security;
alter table public.bank_sync_items enable row level security;
alter table public.bank_records enable row level security;
revoke all on public.bank_links,public.bank_sync_runs,public.bank_sync_items,public.bank_records from public,anon,authenticated;
grant select on public.bank_links to authenticated;
create policy "Read household bank status" on public.bank_links for select to authenticated using(household_id=public.get_my_household_id());
grant all on public.bank_links,public.bank_sync_runs,public.bank_sync_items,public.bank_records to service_role;

-- Only the server's owner-checked action may create a link. Never accept browser supplied credentials.
create function public.link_bank_account(p_owner uuid,p_household uuid,p_account uuid,p_user text,p_external text,p_name text,p_cutover date)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if not exists(select 1 from public.household_members where user_id=p_owner and household_id=p_household)
 or not exists(select 1 from public.accounts where id=p_account and household_id=p_household and currency='NZD') then raise exception 'Account not authorised'; end if;
 if p_cutover is null or p_cutover > (now() at time zone 'Pacific/Auckland')::date or p_user !~ '^user_[a-zA-Z0-9]+$' or p_external !~ '^acc_[a-zA-Z0-9]+$' then raise exception 'Invalid mapping'; end if;
 insert into public.bank_links(account_id,household_id,owner_id,provider_user_id,provider_account_id,name,cutover_date,history_cursor)
 values(p_account,p_household,p_owner,p_user,p_external,left(p_name,160),p_cutover,p_cutover) returning id into v_id;
 return v_id;
end $$;

create function public.claim_bank_sync(p_link uuid,p_kind text,p_refresh timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.bank_links; r public.bank_sync_runs; v_today date := (now() at time zone 'Pacific/Auckland')::date;
 v_from date; v_to date; v_lease uuid := gen_random_uuid();
begin
 select * into l from public.bank_links where id=p_link for update;
 if not found or not l.enabled or not exists(select 1 from public.household_members where household_id=l.household_id and user_id=l.owner_id) then raise exception 'Link not authorised'; end if;
 if p_kind not in ('recent','history') or p_refresh is null or p_refresh < now()-interval '72 hours' or p_refresh>now()+interval '5 minutes' then raise exception 'Invalid sync scope'; end if;
 select * into r from public.bank_sync_runs where link_id=l.id and kind=p_kind and state='fetching' for update;
 if found then
   if r.lease_until>now() then return jsonb_build_object('busy',true); end if;
   if r.refreshed_at<>p_refresh then
     delete from public.bank_sync_items where run_id=r.id;
     update public.bank_sync_runs set cursor=null,cursors='{}',pages=0,complete_pages=false,refreshed_at=p_refresh where id=r.id;
   end if;
 else
   if p_kind='recent' then v_from:=greatest(l.cutover_date,v_today-30); v_to:=v_today;
   else
     v_from:=l.history_cursor;
     if v_from>=greatest(l.cutover_date,v_today-30) then v_from:=l.cutover_date; end if;
     v_to:=least(v_from+29,v_today-31);
     if v_to<v_from then return null; end if;
   end if;
   insert into public.bank_sync_runs(link_id,kind,date_from,date_to,refreshed_at) values(l.id,p_kind,v_from,v_to,p_refresh) returning * into r;
 end if;
 if p_kind='recent' then update public.bank_links set sync_pending=true where id=l.id; end if;
 update public.bank_sync_runs set lease=v_lease,lease_until=now()+interval '2 minutes' where id=r.id returning * into r;
 return to_jsonb(r);
end $$;

create function public.stage_bank_page(p_run uuid,p_lease uuid,p_cursor text,p_next text,p_rows jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare r public.bank_sync_runs; l public.bank_links; row jsonb; v_old jsonb;
begin
 select * into r from public.bank_sync_runs where id=p_run for update;
 if not found or r.state<>'fetching' or p_lease is null or r.lease is distinct from p_lease or r.lease_until is null or r.lease_until<now() or r.complete_pages or r.cursor is distinct from p_cursor then raise exception 'Stale sync worker'; end if;
 select * into l from public.bank_links where id=r.link_id;
 if not l.enabled then raise exception 'Link paused'; end if;
 if p_next is not null and (p_next=p_cursor or p_next=any(r.cursors) or length(p_next) not between 1 and 4000) then raise exception 'Repeated cursor'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>1000 then raise exception 'Invalid page'; end if;
 for row in select value from jsonb_array_elements(p_rows) loop
   if row->>'accountId' is distinct from l.provider_account_id or row->>'id' is null or row->>'id' !~ '^trans_[a-zA-Z0-9]+$'
      or row->>'date' is null or (row->>'date')::date not between r.date_from and r.date_to
      or row->>'description' is null or length(trim(row->>'description')) not between 1 and 2000
      or jsonb_typeof(row->'amountCents') is distinct from 'number' or row->>'amountCents' !~ '^-?[0-9]+$'
      or abs((row->>'amountCents')::numeric)>2147483647
      or row->>'timestamp' is null or row->>'updatedAt' is null then raise exception 'Invalid bank row'; end if;
   if ((row->>'timestamp')::timestamptz at time zone 'Pacific/Auckland')::date <> (row->>'date')::date then raise exception 'Invalid bank date'; end if;
   select payload into v_old from public.bank_sync_items where run_id=r.id and provider_id=row->>'id';
   if found and v_old<>row then raise exception 'Changing duplicate provider ID'; end if;
   insert into public.bank_sync_items(run_id,provider_id,payload) values(r.id,row->>'id',row) on conflict do nothing;
 end loop;
 update public.bank_sync_runs set cursor=p_next,complete_pages=(p_next is null),pages=pages+1,
   cursors=case when p_cursor is null then cursors else array_append(cursors,p_cursor) end where id=r.id;
end $$;

create function public.finish_bank_sync(p_run uuid,p_lease uuid,p_refresh timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.bank_sync_runs; l public.bank_links; item record; b public.bank_records;
 v_tx uuid; v_category uuid; v_changed boolean; v_candidates integer; v_new integer:=0; v_updates integer:=0; v_removed integer:=0; v_result jsonb;
begin
 -- Match claim's link -> run lock order, including retries.
 select lnk.* into l from public.bank_links lnk join public.bank_sync_runs sr on sr.link_id=lnk.id where sr.id=p_run for update of lnk;
 select * into r from public.bank_sync_runs where id=p_run for update;
 if not found then raise exception 'Unknown sync'; end if;
 if r.state='complete' then return r.result; end if;
 if r.state<>'fetching' or p_lease is null or r.lease is distinct from p_lease or r.lease_until is null or r.lease_until<now() or not r.complete_pages or r.pages=0 then raise exception 'Incomplete or stale sync'; end if;
 if not l.enabled or not exists(select 1 from public.household_members where household_id=l.household_id and user_id=l.owner_id) then raise exception 'Link not authorised'; end if;
 if p_refresh is distinct from r.refreshed_at then raise exception 'Provider changed'; end if;
 perform 1 from public.accounts where id=l.account_id and household_id=l.household_id for update;
 if not found then raise exception 'Account not authorised'; end if;
 for item in select provider_id,payload from public.bank_sync_items where run_id=r.id order by provider_id loop
   select * into b from public.bank_records where link_id=l.id and provider_id=item.provider_id;
   if found then
     if b.provider_seen_at>r.refreshed_at then continue; end if;
     v_changed := (b.payload->>'amountCents',b.payload->>'date',b.payload->>'description') is distinct from
       (item.payload->>'amountCents',item.payload->>'date',item.payload->>'description') or b.removed_at is not null;
     if b.hidden_at is null and b.transaction_id is not null then
       update public.transactions set date=(item.payload->>'date')::date,amount_cents=(item.payload->>'amountCents')::integer,
         description=item.payload->>'description',merchant_name=item.payload->>'merchant',bank_removed_at=null,
         bank_revision=bank_revision+case when v_changed then 1 else 0 end,
         bank_changed_at=case when v_changed then now() else bank_changed_at end where id=b.transaction_id;
       if v_changed then v_updates:=v_updates+1; end if;
     end if;
     update public.bank_records set payload=item.payload,provider_seen_at=r.refreshed_at,removed_at=null where link_id=l.id and provider_id=item.provider_id;
   else
     -- Adopt only one unambiguous statement record; never guess across descriptions or repeat purchases.
     select count(*) into v_candidates from public.transactions where account_id=l.account_id and source in ('csv','pdf')
       and date=(item.payload->>'date')::date and amount_cents=(item.payload->>'amountCents')::integer;
     v_tx:=null;
     if v_candidates>0 then
       if v_candidates<>1 or (select count(*) from public.bank_sync_items where run_id=r.id and payload->>'date'=item.payload->>'date' and payload->>'amountCents'=item.payload->>'amountCents')<>1 then raise exception 'Ambiguous statement overlap'; end if;
       select id into v_tx from public.transactions where account_id=l.account_id and source in ('csv','pdf')
         and date=(item.payload->>'date')::date and amount_cents=(item.payload->>'amountCents')::integer and description=item.payload->>'description';
       if v_tx is null then raise exception 'Ambiguous statement overlap'; end if;
       update public.transactions set source='bank',bank_revision=1,bank_changed_at=now() where id=v_tx;
     else
       select category_id into v_category from public.merchant_category_map where household_id=l.household_id and merchant_name=item.payload->>'merchant';
       insert into public.transactions(account_id,date,amount_cents,description,merchant_name,category_id,category_source,source,bank_revision,bank_changed_at)
       values(l.account_id,(item.payload->>'date')::date,(item.payload->>'amountCents')::integer,item.payload->>'description',item.payload->>'merchant',v_category,case when v_category is null then null else 'map' end,'bank',1,now()) returning id into v_tx;
       v_new:=v_new+1;
     end if;
     insert into public.bank_records(link_id,provider_id,transaction_id,payload,provider_seen_at) values(l.id,item.provider_id,v_tx,item.payload,r.refreshed_at);
   end if;
 end loop;
 -- Absence is meaningful only after all pages of this exact, unchanged provider window succeeded.
 for b in select * from public.bank_records br where br.link_id=l.id and br.removed_at is null and br.provider_seen_at<=r.refreshed_at
   and (br.payload->>'date')::date between r.date_from and r.date_to
   and not exists(select 1 from public.bank_sync_items si where si.run_id=r.id and si.provider_id=br.provider_id)
 loop
   update public.bank_records set removed_at=now() where link_id=l.id and provider_id=b.provider_id;
   update public.transactions set bank_removed_at=now(),bank_revision=bank_revision+1,bank_changed_at=now() where id=b.transaction_id;
   v_removed:=v_removed+1;
 end loop;
 v_result:=jsonb_build_object('inserted',v_new,'updated',v_updates,'removed',v_removed);
 update public.bank_sync_runs set state='complete',result=v_result,finished_at=now(),lease=null,lease_until=null where id=r.id;
 update public.bank_links set last_success_at=now(),refreshed_at=greatest(refreshed_at,r.refreshed_at),error_code=null,
   recent_refreshed_at=case when r.kind='recent' then r.refreshed_at else recent_refreshed_at end,
   sync_pending=case when r.kind='recent' then false else sync_pending end,
   initial_history_complete=initial_history_complete or (r.kind='history' and r.date_to >= (now() at time zone 'Pacific/Auckland')::date-31) or l.cutover_date >= (now() at time zone 'Pacific/Auckland')::date-30,
   last_recent_date=case when r.kind='recent' then r.date_to else last_recent_date end,
   history_cursor=case when r.kind='history' then r.date_to+1 else history_cursor end where id=l.id;
 delete from public.bank_sync_items where run_id=r.id;
 return v_result;
end $$;

create function public.bank_delete_tombstone() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.bank_records set hidden_at=now() where transaction_id=old.id;
 return old;
end $$;
create trigger bank_delete_tombstone before delete on public.transactions for each row execute function public.bank_delete_tombstone();
revoke all on function public.bank_delete_tombstone() from public,anon,authenticated;

-- Browser callers cannot manufacture provider identities, sync leases or service-level household scopes.
revoke all on function public.link_bank_account(uuid,uuid,uuid,text,text,text,date), public.claim_bank_sync(uuid,text,timestamptz),
 public.stage_bank_page(uuid,uuid,text,text,jsonb), public.finish_bank_sync(uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.link_bank_account(uuid,uuid,uuid,text,text,text,date), public.claim_bank_sync(uuid,text,timestamptz),
 public.stage_bank_page(uuid,uuid,text,text,jsonb), public.finish_bank_sync(uuid,uuid,timestamptz) to service_role;

-- Retain the reliability snapshot, excluding bank-removed entries from every financial screen.
do $$ declare definition text; begin
 select pg_get_functiondef('public.financial_snapshot(date,date)'::regprocedure) into definition;
 if position('where a.household_id=v_household and t.date between p_from and p_to' in definition)=0 then raise exception 'Unexpected financial snapshot definition'; end if;
 definition:=replace(definition,'''household'', (select', '''bankLinks'', coalesce((select jsonb_agg(l) from public.bank_links l where l.household_id=v_household), ''[]''::jsonb), ''household'', (select');
 execute replace(definition,'where a.household_id=v_household and t.date between p_from and p_to','where a.household_id=v_household and t.bank_removed_at is null and t.date between p_from and p_to');
end $$;
-- A removed bank row must not suppress a later explicit statement import.
do $$ declare definition text; begin
 select pg_get_functiondef('public.commit_import(uuid)'::regprocedure) into definition;
 if position('where t.account_id = d.account_id' in definition)=0 then raise exception 'Unexpected import definition'; end if;
 execute replace(definition,'where t.account_id = d.account_id','where t.account_id = d.account_id and t.bank_removed_at is null');
end $$;
commit;
