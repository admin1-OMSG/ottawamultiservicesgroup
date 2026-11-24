-- TEST BRANCH ONLY. Never apply or merge this fixture into production.
-- The isolated Supabase branch failed replaying legacy migrations because the
-- old history assumes base CRM tables created outside its recorded migrations.
-- This minimal empty admin table supports professional-onboarding smoke tests;
-- it is not a complete CRM schema or a replacement for production admin_users.
begin;
create table public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin',
  is_active boolean not null default false
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated;
grant select on public.admin_users to authenticated;
create policy "Staging active admins read own membership" on public.admin_users
  for select to authenticated
  using (id = (select auth.uid()) and is_active = true);
commit;
