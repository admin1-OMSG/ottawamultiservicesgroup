-- CRM v1.4.1 - connect public partner applications to the Partners CRM workflow
alter table public.partner_applications
  add column if not exists preferred_language text not null default 'en',
  add column if not exists review_status text not null default 'new',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists converted_partner_id uuid references public.partners(id) on delete set null;

alter table public.partner_applications drop constraint if exists partner_applications_preferred_language_check;
alter table public.partner_applications add constraint partner_applications_preferred_language_check check (preferred_language in ('en','fr'));
alter table public.partner_applications drop constraint if exists partner_applications_review_status_check;
alter table public.partner_applications add constraint partner_applications_review_status_check check (review_status in ('new','approved','rejected'));

create index if not exists partner_applications_review_status_idx on public.partner_applications(review_status);

drop policy if exists "Active admins review partner applications" on public.partner_applications;
create policy "Active admins review partner applications" on public.partner_applications for select to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));

drop policy if exists "Active admins update partner applications" on public.partner_applications;
create policy "Active admins update partner applications" on public.partner_applications for update to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true))
with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));
