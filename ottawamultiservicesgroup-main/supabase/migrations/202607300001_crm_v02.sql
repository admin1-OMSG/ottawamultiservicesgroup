-- Ottawa Multiservices Group CRM v0.2
-- Run this migration in Supabase before using Customers and Estimates.

create extension if not exists pgcrypto;

-- Existing projects already have customers. These additions are safe and reversible.
alter table if exists public.customers
  add column if not exists status text not null default 'active',
  add column if not exists internal_notes text,
  add column if not exists updated_at timestamptz not null default now();

create sequence if not exists public.estimate_number_seq start 1;

create or replace function public.generate_estimate_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return 'Q-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.estimate_number_seq')::text, 6, '0');
end;
$$;

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  estimate_number text not null unique default public.generate_estimate_number(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_request_id uuid references public.service_requests(id) on delete set null,
  title text,
  status text not null default 'draft' check (status in ('draft','pending_review','sent','viewed','accepted','rejected','expired','cancelled','converted_to_job')),
  valid_until date,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  tax_rate numeric(7,6) not null default 0.13 check (tax_rate >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  currency char(3) not null default 'CAD',
  notes text,
  terms text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  position integer not null default 1 check (position > 0),
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  line_subtotal numeric(12,2) not null default 0 check (line_subtotal >= 0),
  line_total numeric(12,2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (estimate_id, position)
);

create index if not exists estimates_customer_id_idx on public.estimates(customer_id);
create index if not exists estimates_status_idx on public.estimates(status);
create index if not exists estimates_created_at_idx on public.estimates(created_at desc);
create index if not exists estimate_items_estimate_id_idx on public.estimate_items(estimate_id);

alter table public.estimates enable row level security;
alter table public.estimate_items enable row level security;

-- Admin access is derived from admin_users, never from frontend-provided role values.
drop policy if exists "Active admins can manage estimates" on public.estimates;
create policy "Active admins can manage estimates" on public.estimates
for all to authenticated
using (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true))
with check (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true));

drop policy if exists "Active admins can manage estimate items" on public.estimate_items;
create policy "Active admins can manage estimate items" on public.estimate_items
for all to authenticated
using (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true))
with check (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true));

-- Add customer policies only if RLS is already part of the project design.
alter table public.customers enable row level security;
drop policy if exists "Active admins can manage customers" on public.customers;
create policy "Active admins can manage customers" on public.customers
for all to authenticated
using (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true))
with check (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true));
