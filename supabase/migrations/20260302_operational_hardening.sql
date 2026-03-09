-- DEPRECATED: this migration assumes stock_inward.stock_inward_id and processing_entries.processing_entry_id.
-- Use 20260302_corrected_schema.sql for the current production schema.
-- Operational hardening for stock-lot lifecycle, member splits, atomic saves, and audit.

create extension if not exists pgcrypto;

-- 1) Stock lots (DB-backed lifecycle)
create table if not exists public.processing_lots (
  lot_id uuid primary key default gen_random_uuid(),
  stock_inward_id uuid references public.stock_inward(stock_inward_id) on delete cascade,
  entry_date date not null,
  shed_id uuid not null references public.sheds(shed_id),
  company_id uuid not null references public.companies(company_id),
  raw_weight_kg numeric(12,3) not null check (raw_weight_kg >= 0),
  processed_weight_kg numeric(12,3) not null default 0 check (processed_weight_kg >= 0),
  status text not null default 'open' check (status in ('open','closed')),
  closed_reason text,
  closed_by uuid,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_processing_lots_open on public.processing_lots(status, entry_date desc);
create index if not exists idx_processing_lots_shed_company on public.processing_lots(shed_id, company_id, entry_date desc);
create unique index if not exists uq_processing_lots_stock_inward on public.processing_lots(stock_inward_id) where stock_inward_id is not null;

-- 2) Member split persistence
create table if not exists public.processing_entry_members (
  processing_entry_member_id uuid primary key default gen_random_uuid(),
  processing_entry_id uuid not null references public.processing_entries(processing_entry_id) on delete cascade,
  member_id uuid not null references public.batch_members(member_id),
  processed_weight_kg numeric(12,3) not null check (processed_weight_kg > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_processing_entry_members_entry on public.processing_entry_members(processing_entry_id);
create index if not exists idx_processing_entry_members_member on public.processing_entry_members(member_id);

-- 3) Processing entry audit trail
create table if not exists public.processing_entry_audit (
  audit_id uuid primary key default gen_random_uuid(),
  processing_entry_id uuid references public.processing_entries(processing_entry_id),
  action text not null check (action in ('create','update','void')),
  reason text,
  changed_by uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_processing_entry_audit_entry on public.processing_entry_audit(processing_entry_id, created_at desc);

-- 4) Master data change history
create table if not exists public.master_data_audit (
  audit_id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text,
  action text not null check (action in ('insert','update','delete')),
  changed_by uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_master_data_audit_table_created on public.master_data_audit(table_name, created_at desc);

-- 5) Lot actions
create table if not exists public.processing_lot_actions (
  action_id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.processing_lots(lot_id) on delete cascade,
  action text not null check (action in ('create','close','reopen','adjust')),
  reason text,
  changed_by uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_processing_lot_actions_lot on public.processing_lot_actions(lot_id, created_at desc);

alter table public.processing_entries
  add column if not exists lot_id uuid references public.processing_lots(lot_id);

create index if not exists idx_processing_entries_lot on public.processing_entries(lot_id, entry_date desc);

-- Utility trigger for updated_at
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_processing_lots_updated_at on public.processing_lots;
create trigger trg_processing_lots_updated_at
before update on public.processing_lots
for each row
execute function public.tg_set_updated_at();

-- Stock inward -> lot bootstrap (idempotent)
create or replace function public.ensure_processing_lot_from_stock()
returns trigger
language plpgsql
as $$
declare
  v_entry_date date;
  v_lot_id uuid;
begin
  v_entry_date := coalesce(new.entry_date, new.inward_date, (new.created_at at time zone 'utc')::date);

  insert into public.processing_lots (
    stock_inward_id,
    entry_date,
    shed_id,
    company_id,
    raw_weight_kg,
    processed_weight_kg,
    status
  )
  values (
    new.stock_inward_id,
    v_entry_date,
    new.shed_id,
    new.company_id,
    coalesce(new.raw_weight_kg, 0),
    0,
    'open'
  )
  on conflict do nothing
  returning lot_id into v_lot_id;

  if v_lot_id is not null then
    insert into public.processing_lot_actions(lot_id, action, reason, changed_by)
    values (v_lot_id, 'create', 'Auto-created from stock inward', null);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_stock_inward_to_lot on public.stock_inward;
create trigger trg_stock_inward_to_lot
after insert on public.stock_inward
for each row
execute function public.ensure_processing_lot_from_stock();

-- Master audit trigger factory
create or replace function public.tg_master_audit()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.master_data_audit(table_name, record_id, action, after_data)
    values (tg_table_name, to_jsonb(new)->>coalesce(tg_argv[0], 'id'), 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.master_data_audit(table_name, record_id, action, before_data, after_data)
    values (tg_table_name, to_jsonb(new)->>coalesce(tg_argv[0], 'id'), 'update', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.master_data_audit(table_name, record_id, action, before_data)
    values (tg_table_name, to_jsonb(old)->>coalesce(tg_argv[0], 'id'), 'delete', to_jsonb(old));
    return old;
  end if;
end;
$$;

-- Attach master audit triggers

do $$
begin
  if to_regclass('public.companies') is not null then
    drop trigger if exists trg_companies_master_audit on public.companies;
    create trigger trg_companies_master_audit after insert or update or delete on public.companies
    for each row execute function public.tg_master_audit('company_id');
  end if;

  if to_regclass('public.sheds') is not null then
    drop trigger if exists trg_sheds_master_audit on public.sheds;
    create trigger trg_sheds_master_audit after insert or update or delete on public.sheds
    for each row execute function public.tg_master_audit('shed_id');
  end if;

  if to_regclass('public.processing_types') is not null then
    drop trigger if exists trg_processing_types_master_audit on public.processing_types;
    create trigger trg_processing_types_master_audit after insert or update or delete on public.processing_types
    for each row execute function public.tg_master_audit('processing_type_id');
  end if;

  if to_regclass('public.count_ranges') is not null then
    drop trigger if exists trg_count_ranges_master_audit on public.count_ranges;
    create trigger trg_count_ranges_master_audit after insert or update or delete on public.count_ranges
    for each row execute function public.tg_master_audit('count_range_id');
  end if;

  if to_regclass('public.batches') is not null then
    drop trigger if exists trg_batches_master_audit on public.batches;
    create trigger trg_batches_master_audit after insert or update or delete on public.batches
    for each row execute function public.tg_master_audit('batch_id');
  end if;

  if to_regclass('public.batch_members') is not null then
    drop trigger if exists trg_batch_members_master_audit on public.batch_members;
    create trigger trg_batch_members_master_audit after insert or update or delete on public.batch_members
    for each row execute function public.tg_master_audit('member_id');
  end if;

  if to_regclass('public.worker_rates') is not null then
    drop trigger if exists trg_worker_rates_master_audit on public.worker_rates;
    create trigger trg_worker_rates_master_audit after insert or update or delete on public.worker_rates
    for each row execute function public.tg_master_audit('worker_rate_id');
  end if;
end
$$;

-- Atomic processing submit RPC
create or replace function public.process_round_submit(
  p_lot_id uuid,
  p_batch_id uuid,
  p_processing_type_id uuid,
  p_count_range_id uuid,
  p_member_weights jsonb,
  p_rate_per_kg_snapshot numeric,
  p_entry_date date default null,
  p_actor uuid default null
)
returns table(
  processing_entry_id uuid,
  amount_snapshot numeric,
  lot_remaining_kg numeric
)
language plpgsql
security definer
as $$
declare
  v_lot public.processing_lots%rowtype;
  v_total_kg numeric(12,3) := 0;
  v_amount numeric(12,3);
  v_entry_id uuid;
  v_item jsonb;
  v_member_id uuid;
  v_member_kg numeric(12,3);
begin
  select * into v_lot
  from public.processing_lots
  where lot_id = p_lot_id
  for update;

  if not found then
    raise exception 'Lot not found';
  end if;

  if v_lot.status <> 'open' then
    raise exception 'Lot is not open';
  end if;

  if p_member_weights is null or jsonb_typeof(p_member_weights) <> 'array' then
    raise exception 'Member weights must be JSON array';
  end if;

  for v_item in select * from jsonb_array_elements(p_member_weights)
  loop
    v_member_id := (v_item->>'member_id')::uuid;
    v_member_kg := coalesce((v_item->>'weight_kg')::numeric, 0);

    if v_member_kg > 0 then
      v_total_kg := v_total_kg + v_member_kg;
    end if;
  end loop;

  if v_total_kg <= 0 then
    raise exception 'Total member weight must be > 0';
  end if;

  if (v_lot.raw_weight_kg - v_lot.processed_weight_kg) < v_total_kg then
    raise exception 'Processing exceeds lot balance';
  end if;

  v_amount := round((v_total_kg * p_rate_per_kg_snapshot)::numeric, 2);

  insert into public.processing_entries (
    lot_id,
    entry_date,
    shed_id,
    company_id,
    batch_id,
    processing_type_id,
    count_range_id,
    processed_weight_kg,
    rate_per_kg_snapshot,
    amount_snapshot
  )
  values (
    p_lot_id,
    coalesce(p_entry_date, v_lot.entry_date),
    v_lot.shed_id,
    v_lot.company_id,
    p_batch_id,
    p_processing_type_id,
    p_count_range_id,
    v_total_kg,
    p_rate_per_kg_snapshot,
    v_amount
  )
  returning public.processing_entries.processing_entry_id into v_entry_id;

  for v_item in select * from jsonb_array_elements(p_member_weights)
  loop
    v_member_id := (v_item->>'member_id')::uuid;
    v_member_kg := coalesce((v_item->>'weight_kg')::numeric, 0);

    if v_member_kg > 0 then
      insert into public.processing_entry_members(processing_entry_id, member_id, processed_weight_kg)
      values (v_entry_id, v_member_id, v_member_kg);
    end if;
  end loop;

  update public.processing_lots
  set processed_weight_kg = processed_weight_kg + v_total_kg,
      updated_at = now()
  where lot_id = p_lot_id;

  insert into public.processing_entry_audit(processing_entry_id, action, reason, changed_by, after_data)
  values (
    v_entry_id,
    'create',
    'created via process_round_submit',
    p_actor,
    jsonb_build_object('lot_id', p_lot_id, 'total_kg', v_total_kg, 'rate', p_rate_per_kg_snapshot, 'amount', v_amount)
  );

  return query
  select v_entry_id, v_amount, (v_lot.raw_weight_kg - (v_lot.processed_weight_kg + v_total_kg));
end;
$$;

-- Correction RPC
create or replace function public.void_processing_entry(
  p_processing_entry_id uuid,
  p_reason text,
  p_actor uuid default null
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_row public.processing_entries%rowtype;
  v_lot_id uuid;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Reason is required';
  end if;

  select * into v_row
  from public.processing_entries
  where processing_entry_id = p_processing_entry_id
  for update;

  if not found then
    raise exception 'Processing entry not found';
  end if;

  v_lot_id := v_row.lot_id;

  if v_lot_id is null then
    -- fallback for legacy rows without explicit lot link
    select lot_id into v_lot_id
    from public.processing_lots
    where entry_date = v_row.entry_date
      and shed_id = v_row.shed_id
      and company_id = v_row.company_id
      and processed_weight_kg >= v_row.processed_weight_kg
    order by created_at desc
    limit 1
    for update;
  else
    perform 1 from public.processing_lots where lot_id = v_lot_id for update;
  end if;

  if v_lot_id is not null then
    update public.processing_lots
    set processed_weight_kg = greatest(0, processed_weight_kg - v_row.processed_weight_kg),
        updated_at = now()
    where lot_id = v_lot_id;
  end if;

  insert into public.processing_entry_audit(processing_entry_id, action, reason, changed_by, before_data)
  values (p_processing_entry_id, 'void', p_reason, p_actor, to_jsonb(v_row));

  delete from public.processing_entry_members where processing_entry_id = p_processing_entry_id;
  delete from public.processing_entries where processing_entry_id = p_processing_entry_id;

  return true;
end;
$$;
