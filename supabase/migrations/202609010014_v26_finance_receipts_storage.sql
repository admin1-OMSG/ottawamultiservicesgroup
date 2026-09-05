-- OMSG v2.6 - Finance receipt uploads
-- Creates a private Supabase Storage bucket for expense receipts.
-- Safe additive migration.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'finance-receipts',
  'finance-receipts',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active admins read finance receipts"
  on storage.objects;

create policy "Active admins read finance receipts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'finance-receipts'
  and exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
);

drop policy if exists "Active admins upload finance receipts"
  on storage.objects;

create policy "Active admins upload finance receipts"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'finance-receipts'
  and exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
);

drop policy if exists "Active admins update finance receipts"
  on storage.objects;

create policy "Active admins update finance receipts"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'finance-receipts'
  and exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
)
with check (
  bucket_id = 'finance-receipts'
  and exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
);

drop policy if exists "Active admins delete finance receipts"
  on storage.objects;

create policy "Active admins delete finance receipts"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'finance-receipts'
  and exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
);
