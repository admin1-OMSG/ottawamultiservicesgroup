begin;

create table if not exists public.estimate_signatures (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null unique references public.estimates(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  signer_user_id uuid not null references auth.users(id) on delete restrict,
  signer_name text not null,
  signature_data_url text not null,
  consent_text text not null,
  signed_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint estimate_signatures_name_length check (char_length(trim(signer_name)) between 2 and 160),
  constraint estimate_signatures_data_format check (signature_data_url like 'data:image/png;base64,%')
);

create index if not exists estimate_signatures_customer_idx on public.estimate_signatures(customer_id);
create index if not exists estimate_signatures_signed_at_idx on public.estimate_signatures(signed_at desc);

alter table public.estimate_signatures enable row level security;

drop policy if exists "Admins can read estimate signatures"
on public.estimate_signatures;

create policy "Admins can read estimate signatures"
on public.estimate_signatures
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
);

drop policy if exists "Customers can read their estimate signatures"
on public.estimate_signatures;

create policy "Customers can read their estimate signatures"
on public.estimate_signatures
for select
to authenticated
using (
  exists (
    select 1
    from public.customer_accounts ca
    where ca.auth_user_id = auth.uid()
      and ca.customer_id = estimate_signatures.customer_id
  )
);
-- Signature creation is performed only by the sign-estimate Edge Function
-- using the service-role key after checking the authenticated customer.
revoke insert, update, delete on public.estimate_signatures from anon, authenticated;
grant select on public.estimate_signatures to authenticated;

commit;
