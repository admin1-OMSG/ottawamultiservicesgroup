-- CRM v1.4 - Partners / subcontractors
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  address_line text,
  city text,
  province text default 'Ontario',
  postal_code text,
  service_area text,
  services text[] not null default '{}',
  pricing_model text not null default 'negotiated' check (pricing_model in ('negotiated','hourly','fixed','commission')),
  hourly_rate numeric(12,2),
  commission_rate numeric(6,3) check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 100)),
  status text not null default 'active' check (status in ('active','inactive','pending')),
  insurance_expiry date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists partners_status_idx on public.partners(status);
create index if not exists partners_company_name_idx on public.partners(company_name);

create table if not exists public.partner_job_assignments (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  agreed_amount numeric(12,2),
  status text not null default 'assigned' check (status in ('assigned','accepted','completed','cancelled')),
  notes text,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  unique(partner_id, job_id)
);

alter table public.partners enable row level security;
alter table public.partner_job_assignments enable row level security;

drop policy if exists "Active admins manage partners" on public.partners;
create policy "Active admins manage partners" on public.partners for all to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true))
with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));

drop policy if exists "Active admins manage partner assignments" on public.partner_job_assignments;
create policy "Active admins manage partner assignments" on public.partner_job_assignments for all to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true))
with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));
