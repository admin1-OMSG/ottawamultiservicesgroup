-- Ottawa Multiservices Group CRM v0.3
-- Jobs, employee assignment and scheduling.

create sequence if not exists public.job_number_seq start 1;

create or replace function public.generate_job_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return 'JOB-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.job_number_seq')::text, 6, '0');
end;
$$;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  email text,
  phone text,
  role text not null default 'Technicien',
  status text not null default 'active' check (status in ('active','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_number text not null unique default public.generate_job_number(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  estimate_id uuid unique references public.estimates(id) on delete set null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'unscheduled' check (status in ('unscheduled','scheduled','in_progress','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  address_line text,
  city text,
  province text default 'ON',
  postal_code text,
  internal_notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end is null or scheduled_start is null or scheduled_end > scheduled_start)
);

create index if not exists jobs_customer_id_idx on public.jobs(customer_id);
create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_scheduled_start_idx on public.jobs(scheduled_start);
create index if not exists jobs_assigned_employee_id_idx on public.jobs(assigned_employee_id);
create index if not exists employees_status_idx on public.employees(status);

alter table public.jobs enable row level security;
alter table public.employees enable row level security;

drop policy if exists "Active admins can manage jobs" on public.jobs;
create policy "Active admins can manage jobs" on public.jobs
for all to authenticated
using (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true))
with check (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true));

drop policy if exists "Active admins can manage employees" on public.employees;
create policy "Active admins can manage employees" on public.employees
for all to authenticated
using (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true))
with check (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true));
