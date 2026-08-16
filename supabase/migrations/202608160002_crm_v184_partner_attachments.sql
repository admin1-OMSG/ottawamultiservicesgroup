-- CRM v1.8.4 - partner application attachments
create table if not exists public.partner_application_attachments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.partner_applications(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint not null check (file_size >= 0 and file_size <= 10485760),
  category text not null default 'other' check (category in ('cv_resume','project_details','images','schedule','certificate','other')),
  created_at timestamptz not null default now()
);

create index if not exists partner_application_attachments_application_idx
  on public.partner_application_attachments(application_id, created_at);

alter table public.partner_application_attachments enable row level security;

drop policy if exists "Public adds partner attachment metadata" on public.partner_application_attachments;
create policy "Public adds partner attachment metadata" on public.partner_application_attachments
for insert to anon, authenticated
with check (exists (select 1 from public.partner_applications pa where pa.id = application_id));

drop policy if exists "Active admins read partner attachments" on public.partner_application_attachments;
create policy "Active admins read partner attachments" on public.partner_application_attachments
for select to authenticated
using (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true));

drop policy if exists "Active admins delete partner attachments" on public.partner_application_attachments;
create policy "Active admins delete partner attachments" on public.partner_application_attachments
for delete to authenticated
using (exists (select 1 from public.admin_users au where au.id = auth.uid() and au.is_active = true));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'partner-documents','partner-documents',false,10485760,
  array[
    'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg','image/png','image/webp','text/calendar','application/octet-stream'
  ]
)
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Public uploads partner documents" on storage.objects;
create policy "Public uploads partner documents" on storage.objects
for insert to anon, authenticated
with check (
  bucket_id='partner-documents'
  and exists (select 1 from public.partner_applications pa where pa.id::text=(storage.foldername(name))[1])
);

drop policy if exists "Active admins read partner documents" on storage.objects;
create policy "Active admins read partner documents" on storage.objects
for select to authenticated
using (
  bucket_id='partner-documents'
  and exists (select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true)
);

drop policy if exists "Active admins delete partner documents" on storage.objects;
create policy "Active admins delete partner documents" on storage.objects
for delete to authenticated
using (
  bucket_id='partner-documents'
  and exists (select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true)
);
