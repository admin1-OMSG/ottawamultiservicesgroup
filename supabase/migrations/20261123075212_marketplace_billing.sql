begin;

-- Ledger and payment records never have direct client grants.
create schema market_billing;
revoke all on schema market_billing from public, anon, authenticated, service_role;
grant usage on schema market_billing to authenticated, service_role;

create table market_billing.settings (
  singleton boolean primary key default true check(singleton),
  preview_checkout_enabled boolean not null default false
);
insert into market_billing.settings default values;

create table market_billing.offers (
  code text primary key check (code in ('pack52','pack104','pack208','monthly')),
  kind text not null check (kind in ('pack','subscription')),
  name text not null,
  price_cents integer check (price_cents between 50 and 9999999),
  credits integer check (credits between 1 and 100000),
  enabled boolean not null default false,
  check (not enabled or (price_cents is not null and credits is not null)),
  check ((code='monthly' and kind='subscription') or
    (kind='pack' and price_cents = case code when 'pack52' then 5200 when 'pack104' then 10400 when 'pack208' then 20800 else -1 end and price_cents is not null))
);
insert into market_billing.offers(code,kind,name,price_cents) values
  ('pack52','pack','Pack 52 CAD',5200),('pack104','pack','Pack 104 CAD',10400),
  ('pack208','pack','Pack 208 CAD',20800),('monthly','subscription','OMSG Monthly',null);
create table market_billing.tariffs (
  service text primary key check (length(service) between 1 and 100),
  credits integer not null check (credits between 1 and 100000)
);
create table market_billing.wallets (
  provider_id uuid primary key references public.professional_accounts(id),
  balance bigint not null default 0 check(balance >= 0),
  discount_percent integer not null default 0 check(discount_percent between 0 and 99)
);
create table market_billing.ledger (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references market_billing.wallets(provider_id),
  delta integer not null check(delta <> 0), source text not null unique,
  created_at timestamptz not null default now()
);
create index on market_billing.ledger(provider_id,created_at desc);
create table market_billing.refunds (
  contact_id uuid primary key references market_private.contacts(id),
  reason text not null check(reason in ('invalid_phone','request_in_error')),
  request_note text check(length(request_note)<=1000),
  status text not null default 'pending' check(status in ('pending','approved','denied')),
  created_at timestamptz not null default now(), reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id), note text check(length(note)<=1000)
);
create table market_billing.orders (
  id uuid primary key default gen_random_uuid(), provider_id uuid not null references market_billing.wallets(provider_id),
  attempt_id uuid not null, offer_code text not null references market_billing.offers(code),
  price_cents integer not null check(price_cents>=50), credits integer not null check(credits>0),
  created_at timestamptz not null default now(), expires_at timestamptz not null default(now()+interval '1 hour'),
  return_request_id uuid, stripe_session text unique, stripe_customer text, stripe_subscription text unique,
  sub_status text, sub_event_at bigint, paid_at timestamptz, expired_at timestamptz,
  unique(provider_id,attempt_id)
);
create index on market_billing.orders(provider_id,created_at desc);

create function market_private.service_price(p_service text) returns integer
language sql stable security definer set search_path='' as $$
  select credits from market_billing.tariffs where service=p_service;
$$;
revoke all on function market_private.service_price(text) from public,anon,authenticated;
create function market_billing.provider(approved_only boolean) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare pid uuid;
begin
  select id into pid from public.professional_accounts where user_id=auth.uid()
    and (not approved_only or review_status='approved');
  if pid is null then raise exception 'approved_provider_required' using errcode='42501'; end if;
  return pid;
end;
$$;
create function market_billing.admin_guard() returns void language plpgsql stable set search_path='' as $$
begin
  if not professional_private.is_active_admin() then raise exception 'admin_required' using errcode='42501'; end if;
end;
$$;
-- The unique source and balance change commit together, including on webhook retry.
create function market_billing.post_entry(pid uuid, amount integer, ref text) returns void
language plpgsql set search_path='' as $$
begin
  insert into market_billing.ledger(provider_id,delta,source) values(pid,amount,ref)
    on conflict(source) do nothing;
  if found then
    update market_billing.wallets set balance=balance+amount
      where provider_id=pid and balance+amount>=0;
    if not found then raise exception 'insufficient_credits'; end if;
  end if;
end;
$$;
create function market_billing.price(price_cents integer, discount integer) returns integer
language sql immutable strict set search_path='' as $$
  select greatest(50,round(price_cents*(100-discount)/100.0)::integer);
$$;
create function market_billing.wallet() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare pid uuid := market_billing.provider(false); wallet market_billing.wallets;
begin
  select * into wallet from market_billing.wallets where provider_id=pid;
  return jsonb_build_object('balance',coalesce(wallet.balance,0),'discount_percent',coalesce(wallet.discount_percent,0),
    'preview_checkout_enabled',(select preview_checkout_enabled from market_billing.settings),
    'packs',(select jsonb_agg(to_jsonb(o)||jsonb_build_object('list_price_cents',o.price_cents,
          'price_cents',market_billing.price(o.price_cents,coalesce(wallet.discount_percent,0))) order by o.price_cents nulls last) from market_billing.offers o),
    'subscription',(select jsonb_build_object('status',sub_status,'offer_code',offer_code) from market_billing.orders
      where provider_id=pid and sub_status is not null and sub_status not in ('canceled','incomplete_expired') order by created_at desc limit 1),
    'refunds',coalesce((select jsonb_agg(jsonb_build_object('contact_id',f.contact_id,'status',f.status,'reason',f.reason,'note',f.note))
      from market_billing.refunds f join market_private.contacts c on c.id=f.contact_id where c.provider_id=pid),'[]'::jsonb));
end;
$$;
create function market_billing.unlock(p_request_id uuid,p_expected_cost int) returns uuid
language plpgsql security definer set search_path='' as $$
declare pid uuid := market_billing.provider(true); req market_private.requests; cid uuid;
begin
  select * into req from market_private.requests where id=p_request_id for update;
  if not found or req.client_id=auth.uid() then raise exception 'request_unavailable'; end if;
  select id into cid from market_private.contacts where request_id=req.id and provider_id=pid;
  if found then return cid; end if;
  if req.status<>'open' then raise exception 'request_closed'; end if;
  if req.credit_cost is null or req.credit_cost is distinct from p_expected_cost or req.credit_cost<1 then raise exception 'price_changed'; end if;
  insert into market_billing.wallets(provider_id) values(pid) on conflict do nothing;
  -- A failed debit rolls back the conversation and its notification together.
  insert into market_private.contacts(request_id,provider_id,credit_cost) values(req.id,pid,req.credit_cost) returning id into cid;
  perform market_billing.post_entry(pid,-req.credit_cost,'contact:'||cid);
  return cid;
end;
$$;
create function market_billing.request_refund(p_contact_id uuid,p_reason text,p_note text) returns void
language plpgsql security definer set search_path='' as $$
declare pid uuid := market_billing.provider(false);
begin
  if p_reason not in ('invalid_phone','request_in_error') or p_reason is null then raise exception 'invalid_reason'; end if;
  if not exists(select 1 from market_private.contacts where id=p_contact_id and provider_id=pid)
    then raise exception 'contact_unavailable' using errcode='42501'; end if;
  insert into market_billing.refunds(contact_id,reason,request_note) values(p_contact_id,p_reason,nullif(btrim(p_note),''))
    on conflict(contact_id) do nothing;
end;
$$;
create function market_billing.review_refund(p_contact_id uuid,p_approve boolean,p_note text) returns void
language plpgsql security definer set search_path='' as $$
declare f market_billing.refunds; c market_private.contacts; decision text;
begin
  perform market_billing.admin_guard();
  if p_approve is null or nullif(btrim(p_note),'') is null then raise exception 'decision_required'; end if;
  decision := case when p_approve then 'approved' else 'denied' end;
  select * into strict f from market_billing.refunds where contact_id=p_contact_id for update;
  if f.status=decision then return; end if;
  if f.status<>'pending' then raise exception 'already_reviewed'; end if;
  select * into strict c from market_private.contacts where id=p_contact_id;
  if p_approve then perform market_billing.post_entry(c.provider_id,c.credit_cost,'refund:'||c.id); end if;
  update market_billing.refunds set status=decision,note=btrim(p_note),reviewed_at=now(),reviewed_by=auth.uid() where contact_id=p_contact_id;
end;
$$;
create function market_billing.save_offer(p_code text,p_credits integer,p_price_cents integer,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform market_billing.admin_guard();
  update market_billing.offers set credits=p_credits, price_cents=p_price_cents, enabled=p_enabled where code=p_code;
  if not found then raise exception 'invalid_offer'; end if;
end;
$$;
create function market_billing.set_tariff(p_service text,p_credits integer) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform market_billing.admin_guard();
  insert into market_billing.tariffs(service,credits) values(btrim(p_service),p_credits)
    on conflict(service) do update set credits=excluded.credits;
  update market_private.requests set credit_cost=p_credits where service=btrim(p_service) and credit_cost is null and status='open';
end;
$$;
create function market_billing.set_discount(p_account_id uuid,p_percent int) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform market_billing.admin_guard();
  if not exists(select 1 from public.professional_accounts where id=p_account_id and review_status='approved')
    then raise exception 'approved_provider_required'; end if;
  insert into market_billing.wallets(provider_id,discount_percent) values(p_account_id,p_percent)
    on conflict(provider_id) do update set discount_percent=excluded.discount_percent;
end;
$$;
create function market_billing.admin_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  perform market_billing.admin_guard();
  return jsonb_build_object(
    'offers',(select jsonb_agg(to_jsonb(o) order by price_cents nulls last) from market_billing.offers o),
    'tariffs',coalesce((select jsonb_agg(to_jsonb(t) order by service) from market_billing.tariffs t),'[]'::jsonb),
    'refunds',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object(
      'request_id',r.id,'title',r.title,'provider_name',coalesce(nullif(p.business_name,''),p.contact_name),
      'provider_email',p.email,'client_email',case when u.email_confirmed_at is not null then u.email end,
      'client_phone',case when u.phone_confirmed_at is not null then u.phone end,'credits',c.credit_cost)
      order by (f.status='pending') desc,f.created_at desc)
      from market_billing.refunds f join market_private.contacts c on c.id=f.contact_id
      join market_private.requests r on r.id=c.request_id join auth.users u on u.id=r.client_id
      join public.professional_accounts p on p.id=c.provider_id),'[]'::jsonb),
    'partners',coalesce((select jsonb_agg(jsonb_build_object('account_id',p.id,'business_name',coalesce(nullif(p.business_name,''),p.contact_name),
      'email',p.email,'discount_percent',coalesce(w.discount_percent,0)) order by p.business_name)
      from public.professional_accounts p left join market_billing.wallets w on p.id=w.provider_id where p.review_status='approved'),'[]'::jsonb)
  );
end;
$$;

-- Server-only calls: the edge validates the bearer with Auth or verifies Stripe's signature.
create function market_billing.begin_purchase(p_user_id uuid,p_code text,p_attempt uuid,p_lead uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.professional_accounts; o market_billing.offers; w market_billing.wallets; ord market_billing.orders;
begin
  select * into p from public.professional_accounts where user_id=p_user_id and review_status='approved';
  if not found then raise exception 'approved_provider_required'; end if;
  insert into market_billing.wallets(provider_id) values(p.id) on conflict do nothing;
  select * into strict w from market_billing.wallets where provider_id=p.id for update;
  select * into ord from market_billing.orders where provider_id=p.id and attempt_id=p_attempt;
  if found then
    if p_code<>ord.offer_code or p_lead is distinct from ord.return_request_id then raise exception 'attempt_conflict'; end if;
  else
    select * into o from market_billing.offers where code=p_code and enabled;
    if not found then raise exception 'offer_unavailable'; end if;
    if o.kind='subscription' then
      -- A second tab reuses an unfinished checkout. Canceled subscriptions can be restarted.
      select * into ord from market_billing.orders where provider_id=p.id and offer_code=p_code
        and expired_at is null and (sub_status not in ('canceled','incomplete_expired')
          or (sub_status is null and (paid_at is not null or expires_at>now())))
        order by created_at desc limit 1;
      if ord.stripe_subscription is not null or ord.paid_at is not null then raise exception 'subscription_exists'; end if;
    end if;
    if ord.id is null then
      insert into market_billing.orders(provider_id,attempt_id,offer_code,price_cents,credits,return_request_id)
        values(p.id,p_attempt,o.code,market_billing.price(o.price_cents,w.discount_percent),o.credits,p_lead)
        returning * into ord;
    end if;
  end if;
  select * into strict o from market_billing.offers where code=ord.offer_code;
  if ord.expired_at is not null or (ord.paid_at is null and ord.expires_at<=now()) then raise exception 'checkout_expired'; end if;
  return to_jsonb(ord)||jsonb_build_object('kind',o.kind,'name',o.name,'email',p.email,
    'preview_checkout_enabled',(select preview_checkout_enabled from market_billing.settings));
end;
$$;
create function market_billing.simulate(p_order_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare o market_billing.orders;
begin
  if not (select preview_checkout_enabled from market_billing.settings) then raise exception 'simulation_disabled'; end if;
  select * into strict o from market_billing.orders where id=p_order_id for update;
  if o.offer_code='monthly' or o.stripe_session is not null or o.expired_at is not null then raise exception 'cannot_simulate'; end if;
  if o.paid_at is not null then return; end if;
  if o.expires_at<=now() then raise exception 'checkout_expired'; end if;
  perform market_billing.post_entry(o.provider_id,o.credits,'simulation:'||o.id);
  update market_billing.orders set paid_at=now() where id=o.id;
end;
$$;
create function market_billing.link_session(p_order_id uuid,p_session text,p_expired boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  update market_billing.orders set stripe_session=p_session,
    expired_at=case when p_expired and paid_at is null and stripe_subscription is null then now() else expired_at end
    where id=p_order_id and (stripe_session is null or stripe_session=p_session);
  if not found then raise exception 'unknown_checkout'; end if;
end;
$$;
create function market_billing.credit_payment(p_order_id uuid,p_object text,p_amount int,p_currency text,
  p_customer text,p_subscription text) returns void language plpgsql security definer set search_path='' as $$
declare o market_billing.orders;
begin
  select * into strict o from market_billing.orders where id=p_order_id for update;
  if p_currency is distinct from 'cad' or p_amount is distinct from o.price_cents or
    (p_subscription is null) is distinct from (o.offer_code<>'monthly') then raise exception 'payment_mismatch'; end if;
  if p_subscription is null then
    if p_object is null or p_object not like 'cs_%' or (o.stripe_session is not null and o.stripe_session<>p_object) then raise exception 'checkout_mismatch'; end if;
    if o.paid_at is not null and o.stripe_session is null then raise exception 'simulated_order'; end if;
    update market_billing.orders set stripe_session=p_object where id=o.id;
    perform market_billing.post_entry(o.provider_id,o.credits,'pack:'||o.id);
  else
    if p_object not like 'in_%' or p_customer is null or (o.stripe_subscription is not null and o.stripe_subscription<>p_subscription)
      then raise exception 'subscription_mismatch'; end if;
    perform market_billing.post_entry(o.provider_id,o.credits,'invoice:'||p_object);
    update market_billing.orders set stripe_customer=p_customer,stripe_subscription=p_subscription,sub_status=coalesce(sub_status,'active') where id=o.id;
  end if;
  update market_billing.orders set paid_at=coalesce(paid_at,now()) where id=o.id;
end;
$$;
create function market_billing.subscription_state(p_order_id uuid,p_subscription text,p_customer text,p_status text,p_time bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_status not in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused') then raise exception 'unknown_state'; end if;
  update market_billing.orders set stripe_subscription=p_subscription,stripe_customer=p_customer,sub_status=p_status,sub_event_at=p_time
    where id=p_order_id and offer_code='monthly' and (stripe_subscription is null or stripe_subscription=p_subscription)
      and (sub_event_at is null or sub_event_at<=p_time);
end;
$$;
create function market_billing.customer_for_portal(p_user_id uuid) returns text
language sql stable security definer set search_path='' as $$
  select o.stripe_customer from market_billing.orders o join public.professional_accounts p on p.id=o.provider_id
    where p.user_id=p_user_id and o.stripe_customer is not null
    order by (coalesce(o.sub_status,'') not in ('canceled','incomplete_expired')) desc,o.created_at desc limit 1;
$$;

-- Expose only the narrow invoker wrappers; revoke Postgres' default public EXECUTE.
revoke all on all functions in schema market_billing from public,anon,authenticated,service_role;
revoke all on all tables in schema market_billing from public,anon,authenticated,service_role;

create function public.market_wallet() returns jsonb
language sql security invoker set search_path='' as $$ select market_billing.wallet(); $$;
revoke all on function public.market_wallet() from public, anon, authenticated, service_role;
grant execute on function public.market_wallet(), market_billing.wallet() to authenticated;

create function public.market_unlock(p_request_id uuid, p_expected_cost integer) returns uuid
language sql security invoker set search_path='' as $$ select market_billing.unlock(p_request_id, p_expected_cost); $$;
revoke all on function public.market_unlock(uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.market_unlock(uuid, integer), market_billing.unlock(uuid, integer) to authenticated;

create function public.market_request_refund(p_contact_id uuid, p_reason text, p_note text default null) returns void
language sql security invoker set search_path='' as $$ select market_billing.request_refund(p_contact_id, p_reason, p_note); $$;
revoke all on function public.market_request_refund(uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.market_request_refund(uuid, text, text), market_billing.request_refund(uuid, text, text) to authenticated;

create function public.market_review_refund(p_contact_id uuid, p_approve boolean, p_note text) returns void
language sql security invoker set search_path='' as $$ select market_billing.review_refund(p_contact_id, p_approve, p_note); $$;
revoke all on function public.market_review_refund(uuid, boolean, text) from public, anon, authenticated, service_role;
grant execute on function public.market_review_refund(uuid, boolean, text), market_billing.review_refund(uuid, boolean, text) to authenticated;

create function public.market_save_offer(p_code text, p_credits integer, p_price_cents integer, p_enabled boolean) returns void
language sql security invoker set search_path='' as $$ select market_billing.save_offer(p_code, p_credits, p_price_cents, p_enabled); $$;
revoke all on function public.market_save_offer(text, integer, integer, boolean) from public, anon, authenticated, service_role;
grant execute on function public.market_save_offer(text, integer, integer, boolean), market_billing.save_offer(text, integer, integer, boolean) to authenticated;

create function public.market_set_tariff(p_service text, p_credits integer) returns void
language sql security invoker set search_path='' as $$ select market_billing.set_tariff(p_service, p_credits); $$;
revoke all on function public.market_set_tariff(text, integer) from public, anon, authenticated, service_role;
grant execute on function public.market_set_tariff(text, integer), market_billing.set_tariff(text, integer) to authenticated;

create function public.market_set_discount(p_account_id uuid, p_percent integer) returns void
language sql security invoker set search_path='' as $$ select market_billing.set_discount(p_account_id, p_percent); $$;
revoke all on function public.market_set_discount(uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.market_set_discount(uuid, integer), market_billing.set_discount(uuid, integer) to authenticated;

create function public.market_billing_admin() returns jsonb
language sql security invoker set search_path='' as $$ select market_billing.admin_overview(); $$;
revoke all on function public.market_billing_admin() from public, anon, authenticated, service_role;
grant execute on function public.market_billing_admin(), market_billing.admin_overview() to authenticated;

create function public.market_checkout_begin(p_user_id uuid, p_code text, p_attempt uuid, p_lead uuid) returns jsonb
language sql security invoker set search_path='' as $$ select market_billing.begin_purchase(p_user_id, p_code, p_attempt, p_lead); $$;
revoke all on function public.market_checkout_begin(uuid, text, uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.market_checkout_begin(uuid, text, uuid, uuid), market_billing.begin_purchase(uuid, text, uuid, uuid) to service_role;

create function public.market_checkout_simulate(p_order_id uuid) returns void
language sql security invoker set search_path='' as $$ select market_billing.simulate(p_order_id); $$;
revoke all on function public.market_checkout_simulate(uuid) from public, anon, authenticated, service_role;
grant execute on function public.market_checkout_simulate(uuid), market_billing.simulate(uuid) to service_role;

create function public.market_checkout_link(p_order_id uuid, p_session text, p_expired boolean) returns void
language sql security invoker set search_path='' as $$ select market_billing.link_session(p_order_id, p_session, p_expired); $$;
revoke all on function public.market_checkout_link(uuid, text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.market_checkout_link(uuid, text, boolean), market_billing.link_session(uuid, text, boolean) to service_role;

create function public.market_payment_credit(p_order_id uuid, p_object text, p_amount integer, p_currency text, p_customer text, p_subscription text) returns void
language sql security invoker set search_path='' as $$ select market_billing.credit_payment(p_order_id, p_object, p_amount, p_currency, p_customer, p_subscription); $$;
revoke all on function public.market_payment_credit(uuid, text, integer, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.market_payment_credit(uuid, text, integer, text, text, text), market_billing.credit_payment(uuid, text, integer, text, text, text) to service_role;

create function public.market_subscription_state(p_order_id uuid, p_subscription text, p_customer text, p_status text, p_time bigint) returns void
language sql security invoker set search_path='' as $$ select market_billing.subscription_state(p_order_id, p_subscription, p_customer, p_status, p_time); $$;
revoke all on function public.market_subscription_state(uuid, text, text, text, bigint) from public, anon, authenticated, service_role;
grant execute on function public.market_subscription_state(uuid, text, text, text, bigint), market_billing.subscription_state(uuid, text, text, text, bigint) to service_role;

create function public.market_checkout_customer(p_user_id uuid) returns text
language sql security invoker set search_path='' as $$ select market_billing.customer_for_portal(p_user_id); $$;
revoke all on function public.market_checkout_customer(uuid) from public, anon, authenticated, service_role;
grant execute on function public.market_checkout_customer(uuid), market_billing.customer_for_portal(uuid) to service_role;

commit;
