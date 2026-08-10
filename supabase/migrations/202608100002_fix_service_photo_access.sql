-- CRM v0.9.1 - repair service photo storage and RLS after partial v0.9 migration

-- Ensure photo tables exist (safe if already created)
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

create index if not exists service_request_photos_request_idx
  on public.service_request_photos(service_request_id);
create index if not exists job_photos_job_idx
  on public.job_photos(job_id);

alter table public.service_request_photos enable row level security;
alter table public.job_photos enable row level security;

-- Public website may only insert metadata for request photos.
drop policy if exists "Anyone can add request photos" on public.service_request_photos;
create policy "Anyone can add request photos"
on public.service_request_photos
for insert
to anon, authenticated
with check (true);

-- Active admins can read/manage request photo metadata.
drop policy if exists "Admins manage request photos" on public.service_request_photos;
create policy "Admins manage request photos"
on public.service_request_photos
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
);

-- Active admins can manage job photo metadata.
drop policy if exists "Admins manage job photos" on public.job_photos;
create policy "Admins manage job photos"
on public.job_photos
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
);

-- Customers can read photos for their own jobs.
drop policy if exists "Customers read own job photos" on public.job_photos;
create policy "Customers read own job photos"
on public.job_photos
for select
to authenticated
using (
  exists (
    select 1
    from public.jobs j
    join public.customer_accounts ca on ca.customer_id = j.customer_id
    where j.id = job_photos.job_id
      and ca.auth_user_id = auth.uid()
  )
);

-- Ensure private storage bucket exists.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-photos',
  'service-photos',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Anonymous/authenticated visitors can upload only into requests/*.
drop policy if exists "Public uploads quote photos" on storage.objects;
create policy "Public uploads quote photos"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'service-photos'
  and (storage.foldername(name))[1] = 'requests'
);

-- Active admins can read/manage all service photos.
drop policy if exists "Admins manage service photos storage" on storage.objects;
create policy "Admins manage service photos storage"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'service-photos'
  and exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
)
with check (
  bucket_id = 'service-photos'
  and exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
);

-- Customers can read files for their own jobs only.
drop policy if exists "Customers read own completed job photos storage" on storage.objects;
create policy "Customers read own completed job photos storage"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'service-photos'
  and (storage.foldername(name))[1] = 'jobs'
  and exists (
    select 1
    from public.jobs j
    join public.customer_accounts ca on ca.customer_id = j.customer_id
    where j.id::text = (storage.foldername(name))[2]
      and ca.auth_user_id = auth.uid()
  )
);
