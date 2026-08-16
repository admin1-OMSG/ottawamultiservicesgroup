-- CRM v1.8.5 - Fix public partner attachment uploads under RLS
-- The previous policies checked partner_applications directly from anon/authenticated
-- policies. Because partner_applications itself is protected by RLS, the EXISTS
-- check could evaluate to false for public visitors even when the application exists.
-- This security-definer helper performs only the existence check needed by the
-- attachment policies without exposing partner application data.

create or replace function public.partner_application_exists(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_applications pa
    where pa.id = p_application_id
  );
$$;

revoke all on function public.partner_application_exists(uuid) from public;
grant execute on function public.partner_application_exists(uuid) to anon, authenticated;

-- Attachment metadata: public users may add metadata only for an application
-- that already exists. Admin read/delete policies remain unchanged.
drop policy if exists "Public adds partner attachment metadata" on public.partner_application_attachments;
create policy "Public adds partner attachment metadata"
on public.partner_application_attachments
for insert to anon, authenticated
with check (public.partner_application_exists(application_id));

-- Storage objects: allow upload only to partner-documents and only when the first
-- folder component is a valid UUID belonging to an existing partner application.
drop policy if exists "Public uploads partner documents" on storage.objects;
create policy "Public uploads partner documents"
on storage.objects
for insert to anon, authenticated
with check (
  bucket_id = 'partner-documents'
  and (storage.foldername(name))[1] is not null
  and public.partner_application_exists(((storage.foldername(name))[1])::uuid)
);
