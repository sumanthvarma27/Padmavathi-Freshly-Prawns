create extension if not exists pgcrypto;

create table if not exists public.company_rates (
  company_rate_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id),
  rate_per_kg numeric(12,3) not null check (rate_per_kg > 0),
  effective_from timestamptz not null,
  effective_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_rates
  add column if not exists rate_per_kg numeric(12,3),
  add column if not exists effective_from timestamptz,
  add column if not exists effective_to timestamptz,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='company_rates' and column_name='price_per_kg'
  ) then
    execute 'update public.company_rates set rate_per_kg = coalesce(rate_per_kg, price_per_kg)';
  end if;
end $$;

update public.company_rates
set effective_from = coalesce(effective_from, created_at, now())
where effective_from is null;

update public.company_rates
set is_active = coalesce(is_active, true)
where is_active is null;

create index if not exists idx_company_rates_company_effective
  on public.company_rates(company_id, effective_from desc);

create index if not exists idx_company_rates_active
  on public.company_rates(company_id, is_active);

create unique index if not exists uq_company_rates_open_window
  on public.company_rates(company_id)
  where is_active = true and effective_to is null;

-- seed one sample active rate per company (safe idempotent)
insert into public.company_rates (
  company_id,
  processing_type_id,
  count_range_id,
  rate_per_kg,
  effective_from,
  is_active
)
select
  c.company_id,
  pt.processing_type_id,
  cr.count_range_id,
  420,
  '2026-01-01T00:00:00Z'::timestamptz,
  true
from public.companies c
cross join lateral (
  select processing_type_id
  from public.processing_types
  where is_active = true
  order by sort_order nulls last, name
  limit 1
) pt
cross join lateral (
  select count_range_id
  from public.count_ranges
  where is_active = true
  order by sort_order nulls last, label
  limit 1
) cr
where not exists (
  select 1 from public.company_rates cr where cr.company_id = c.company_id
);
