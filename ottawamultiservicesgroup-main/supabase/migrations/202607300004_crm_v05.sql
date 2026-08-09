-- Ottawa Multiservices Group CRM v0.5
-- Secure customer portal, customer documents and estimate responses.

create table if not exists public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists customer_accounts_customer_idx on public.customer_accounts(customer_id);
alter table public.customer_accounts enable row level security;

drop policy if exists "Customers can read their portal account" on public.customer_accounts;
create policy "Customers can read their portal account" on public.customer_accounts
for select to authenticated using (auth_user_id = auth.uid());

-- Automatically connect a Supabase user to an existing CRM customer with the same email.
create or replace function public.link_customer_account()
returns trigger language plpgsql security definer set search_path = public as $$
declare matched_customer uuid;
begin
  select id into matched_customer
  from public.customers
  where lower(email) = lower(new.email)
  order by created_at asc
  limit 1;

  if matched_customer is not null then
    insert into public.customer_accounts(auth_user_id, customer_id)
    values (new.id, matched_customer)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_link_customer on auth.users;
create trigger on_auth_user_link_customer
after insert or update of email on auth.users
for each row execute procedure public.link_customer_account();

-- Backfill links for users created before this migration.
insert into public.customer_accounts(auth_user_id, customer_id)
select u.id, c.id
from auth.users u
join lateral (
  select id from public.customers c2
  where lower(c2.email) = lower(u.email)
  order by c2.created_at asc limit 1
) c on true
on conflict do nothing;

-- Customers may only read their own CRM profile and documents.
drop policy if exists "Customers can read own profile" on public.customers;
create policy "Customers can read own profile" on public.customers
for select to authenticated using (
  exists(select 1 from public.customer_accounts ca where ca.auth_user_id=auth.uid() and ca.customer_id=customers.id)
);

drop policy if exists "Customers can read own estimates" on public.estimates;
create policy "Customers can read own estimates" on public.estimates
for select to authenticated using (
  exists(select 1 from public.customer_accounts ca where ca.auth_user_id=auth.uid() and ca.customer_id=estimates.customer_id)
);

drop policy if exists "Customers can read own estimate items" on public.estimate_items;
create policy "Customers can read own estimate items" on public.estimate_items
for select to authenticated using (
  exists(select 1 from public.estimates e join public.customer_accounts ca on ca.customer_id=e.customer_id where e.id=estimate_items.estimate_id and ca.auth_user_id=auth.uid())
);

drop policy if exists "Customers can read own invoices" on public.invoices;
create policy "Customers can read own invoices" on public.invoices
for select to authenticated using (
  exists(select 1 from public.customer_accounts ca where ca.auth_user_id=auth.uid() and ca.customer_id=invoices.customer_id)
);

drop policy if exists "Customers can read own invoice items" on public.invoice_items;
create policy "Customers can read own invoice items" on public.invoice_items
for select to authenticated using (
  exists(select 1 from public.invoices i join public.customer_accounts ca on ca.customer_id=i.customer_id where i.id=invoice_items.invoice_id and ca.auth_user_id=auth.uid())
);

drop policy if exists "Customers can read own payments" on public.payments;
create policy "Customers can read own payments" on public.payments
for select to authenticated using (
  exists(select 1 from public.invoices i join public.customer_accounts ca on ca.customer_id=i.customer_id where i.id=payments.invoice_id and ca.auth_user_id=auth.uid())
);

drop policy if exists "Customers can read own jobs" on public.jobs;
create policy "Customers can read own jobs" on public.jobs
for select to authenticated using (
  exists(select 1 from public.customer_accounts ca where ca.auth_user_id=auth.uid() and ca.customer_id=jobs.customer_id)
);

-- Safe RPC: customers can only accept or reject their own sent/viewed estimate.
create or replace function public.customer_respond_to_estimate(p_estimate_id uuid, p_response text)
returns void language plpgsql security definer set search_path=public as $$
declare linked_customer uuid;
begin
  if p_response not in ('accepted','rejected') then raise exception 'Invalid response'; end if;
  select customer_id into linked_customer from public.customer_accounts where auth_user_id=auth.uid();
  if linked_customer is null then raise exception 'Customer account not linked'; end if;
  update public.estimates
  set status=p_response, updated_at=now(), updated_by=auth.uid()
  where id=p_estimate_id and customer_id=linked_customer and status in ('sent','viewed','pending_review');
  if not found then raise exception 'Estimate unavailable'; end if;
end;
$$;
grant execute on function public.customer_respond_to_estimate(uuid,text) to authenticated;
