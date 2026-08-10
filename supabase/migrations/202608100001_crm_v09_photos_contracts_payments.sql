-- CRM v0.9 - quote/job photos, recurring service contracts and payment terms

alter table public.estimates
  add column if not exists service_type text not null default 'one_time',
  add column if not exists recurrence_frequency text,
  add column if not exists contract_months integer,
  add column if not exists contract_discount_percent numeric(5,2) not null default 0,
  add column if not exists deposit_type text not null default 'none',
  add column if not exists deposit_value numeric(12,2) not null default 0;

alter table public.estimates drop constraint if exists estimates_service_type_check;
alter table public.estimates add constraint estimates_service_type_check check (service_type in ('one_time','recurring'));
alter table public.estimates drop constraint if exists estimates_deposit_type_check;
alter table public.estimates add constraint estimates_deposit_type_check check (deposit_type in ('none','percent','fixed'));

create table if not exists public.service_request_photos (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  kind text not null default 'after' check (kind in ('before','after')),
  storage_path text not null unique,
  caption text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  estimate_id uuid unique references public.estimates(id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft','active','paused','completed','cancelled')),
  frequency text not null check (frequency in ('weekly','biweekly','monthly','custom')),
  interval_days integer,
  start_date date not null,
  end_date date,
  normal_price numeric(12,2),
  visit_price numeric(12,2) not null,
  discount_percent numeric(5,2) not null default 0,
  payment_terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_request_photos_request_idx on public.service_request_photos(service_request_id);
create index if not exists job_photos_job_idx on public.job_photos(job_id);
create index if not exists service_contracts_customer_idx on public.service_contracts(customer_id);

alter table public.service_request_photos enable row level security;
alter table public.job_photos enable row level security;
alter table public.service_contracts enable row level security;

drop policy if exists "Anyone can add request photos" on public.service_request_photos;
create policy "Anyone can add request photos" on public.service_request_photos for insert to anon, authenticated with check (true);
drop policy if exists "Admins manage request photos" on public.service_request_photos;
create policy "Admins manage request photos" on public.service_request_photos for all to authenticated using (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true)) with check (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true));
drop policy if exists "Admins manage job photos" on public.job_photos;
create policy "Admins manage job photos" on public.job_photos for all to authenticated using (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true)) with check (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true));
drop policy if exists "Customers read own job photos" on public.job_photos;
create policy "Customers read own job photos" on public.job_photos for select to authenticated using (
 exists(select 1 from public.jobs j join public.customer_accounts ca on ca.customer_id=j.customer_id where j.id=job_photos.job_id and ca.auth_user_id=auth.uid())
);
drop policy if exists "Admins manage contracts" on public.service_contracts;
create policy "Admins manage contracts" on public.service_contracts for all to authenticated using (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true)) with check (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true));
drop policy if exists "Customers read own contracts" on public.service_contracts;
create policy "Customers read own contracts" on public.service_contracts for select to authenticated using (
 exists(select 1 from public.customer_accounts ca where ca.customer_id=service_contracts.customer_id and ca.auth_user_id=auth.uid())
);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('service-photos','service-photos',false,8388608,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=false,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Public uploads quote photos" on storage.objects;
create policy "Public uploads quote photos" on storage.objects for insert to anon, authenticated
with check (bucket_id='service-photos' and (storage.foldername(name))[1]='requests');

drop policy if exists "Admins manage service photos storage" on storage.objects;
create policy "Admins manage service photos storage" on storage.objects for all to authenticated
using (bucket_id='service-photos' and exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true))
with check (bucket_id='service-photos' and exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true));

drop policy if exists "Customers read own completed job photos storage" on storage.objects;
create policy "Customers read own completed job photos storage" on storage.objects for select to authenticated
using (
 bucket_id='service-photos' and (storage.foldername(name))[1]='jobs' and exists(
  select 1 from public.jobs j join public.customer_accounts ca on ca.customer_id=j.customer_id
  where j.id::text=(storage.foldername(name))[2] and ca.auth_user_id=auth.uid()
 )
);
