-- CRM v1.6.1 - resilient automatic customer portal linking
-- Repairs the case where an auth user already exists before the CRM customer
-- record is created (e.g. customer_accounts was cleared but auth.users was kept).

create or replace function public.ensure_my_customer_account()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_email text;
  v_customer_id uuid;
begin
  if v_auth_user_id is null then
    raise exception 'Authentication required';
  end if;

  select ca.customer_id
    into v_customer_id
  from public.customer_accounts ca
  where ca.auth_user_id = v_auth_user_id;

  if v_customer_id is not null then
    update public.customer_accounts
       set last_login_at = now()
     where auth_user_id = v_auth_user_id;
    return v_customer_id;
  end if;

  -- Read the verified identity directly from auth.users. The caller cannot
  -- provide an email or customer id, so another customer's account cannot be
  -- claimed by changing RPC parameters.
  select u.email
    into v_email
  from auth.users u
  where u.id = v_auth_user_id;

  if v_email is null or btrim(v_email) = '' then
    return null;
  end if;

  select c.id
    into v_customer_id
  from public.customers c
  where lower(btrim(c.email)) = lower(btrim(v_email))
  order by c.created_at asc
  limit 1;

  if v_customer_id is null then
    return null;
  end if;

  insert into public.customer_accounts(auth_user_id, customer_id, last_login_at)
  values (v_auth_user_id, v_customer_id, now())
  on conflict do nothing;

  select ca.customer_id
    into v_customer_id
  from public.customer_accounts ca
  where ca.auth_user_id = v_auth_user_id;

  return v_customer_id;
end;
$$;

revoke all on function public.ensure_my_customer_account() from public;
grant execute on function public.ensure_my_customer_account() to authenticated;

-- Also repair links immediately when a CRM customer is created for an Auth
-- user who already exists. This complements the original auth.users trigger.
create or replace function public.link_existing_auth_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
begin
  if new.email is null or btrim(new.email) = '' then
    return new;
  end if;

  select u.id
    into v_auth_user_id
  from auth.users u
  where lower(btrim(u.email)) = lower(btrim(new.email))
  order by u.created_at asc
  limit 1;

  if v_auth_user_id is not null then
    insert into public.customer_accounts(auth_user_id, customer_id)
    values (v_auth_user_id, new.id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_customer_link_existing_auth on public.customers;
create trigger on_customer_link_existing_auth
after insert or update of email on public.customers
for each row execute procedure public.link_existing_auth_customer();

-- Repair current production records too.
insert into public.customer_accounts(auth_user_id, customer_id)
select u.id, c.id
from auth.users u
join lateral (
  select c2.id
  from public.customers c2
  where lower(btrim(c2.email)) = lower(btrim(u.email))
  order by c2.created_at asc
  limit 1
) c on true
where u.email is not null
on conflict do nothing;
