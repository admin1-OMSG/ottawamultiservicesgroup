-- CRM v1.9.2 - allow active admins to permanently delete partner applications/history
-- The admin UI already has Delete / Delete history controls, but partner_applications
-- had SELECT and UPDATE policies only. With RLS enabled, DELETE was therefore blocked.

drop policy if exists "Active admins delete partner applications" on public.partner_applications;
create policy "Active admins delete partner applications"
on public.partner_applications
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
);
