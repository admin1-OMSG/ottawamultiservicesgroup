begin;

alter table market_billing.offers
  drop constraint offers_code_check,
  drop constraint offers_check1,
  add column loyalty_bonus_credits integer not null default 0,
  add constraint offer_terms check (
    (code='monthly' and kind='subscription')
    or (code='monthly208' and kind='subscription' and price_cents is not distinct from 20800
        and credits is not distinct from 240 and loyalty_bonus_credits=20)
    or (kind='pack' and price_cents is not null and
        ((code='pack52' and price_cents=5200) or (code='pack104' and price_cents=10400)
         or (code='pack208' and price_cents=20800)))
  ),
  add constraint offer_loyalty_terms check (
    loyalty_bonus_credits=0 or (loyalty_bonus_credits=20 and code in ('pack208','monthly208')
                                and credits is not distinct from 240)
  );
insert into market_billing.offers(code,kind,name,price_cents,credits,loyalty_bonus_credits)
values ('monthly208','subscription','OMSG Monthly 208 CAD',20800,240,20);

-- Eligibility is fixed at checkout. Pre-existing orders retain their previous terms.
alter table market_billing.orders add column loyalty_bonus_credits integer not null default 0
  check (loyalty_bonus_credits=0 or (loyalty_bonus_credits=20 and offer_code in ('pack208','monthly208') and credits=240));
create index market_paid_loyalty_packs on market_billing.orders(provider_id,(stripe_session is null))
  where offer_code='pack208' and paid_at is not null and loyalty_bonus_credits>0;

create table market_billing.paid_cycles (
  order_id uuid not null references market_billing.orders(id),
  invoice text primary key,
  period_start bigint not null check (period_start>0),
  period_end bigint not null check (period_end>period_start),
  bonus_awarded boolean not null default false,
  unique(order_id,period_start),
  unique(order_id,period_end)
);
alter table market_billing.paid_cycles enable row level security;
revoke all on market_billing.paid_cycles from public, anon, authenticated, service_role;

create or replace function market_billing.begin_purchase(p_user_id uuid,p_code text,p_attempt uuid,p_lead uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
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
      select ords.* into ord from market_billing.orders ords
        join market_billing.offers opts on opts.code=ords.offer_code and opts.kind='subscription'
        where ords.provider_id=p.id and ords.expired_at is null
          and (ords.sub_status not in ('canceled','incomplete_expired') or
            (ords.sub_status is null and (ords.paid_at is not null or ords.stripe_session is not null or ords.expires_at>now())))
        order by ords.created_at desc limit 1;
      if found and (ord.offer_code<>p_code or ord.stripe_subscription is not null or ord.paid_at is not null) then
        raise exception 'subscription_exists';
      end if;
    end if;
    if ord.id is null then
      insert into market_billing.orders(provider_id,attempt_id,offer_code,price_cents,credits,loyalty_bonus_credits,return_request_id)
        values(p.id,p_attempt,o.code,market_billing.price(o.price_cents,w.discount_percent),o.credits,o.loyalty_bonus_credits,p_lead)
        returning * into ord;
    end if;
  end if;
  select * into strict o from market_billing.offers where code=ord.offer_code;
  if ord.expired_at is not null or (ord.paid_at is null and ord.stripe_session is null and ord.expires_at<=now()) then raise exception 'checkout_expired'; end if;
  return to_jsonb(ord)||jsonb_build_object('kind',o.kind,'name',o.name,'email',p.email,
    'preview_checkout_enabled',(select preview_checkout_enabled from market_billing.settings));
end;
$$;

-- Serialize first settlements for each provider. A retry cannot turn an earlier
-- base-only purchase into a bonus. Simulated packs have their own test counter.
create function market_billing.pack_credits(o market_billing.orders, simulated boolean) returns integer
language plpgsql set search_path='' as $$
begin
  if o.loyalty_bonus_credits=0 then return o.credits; end if;
  perform 1 from market_billing.wallets where provider_id=o.provider_id for update;
  if exists(select 1 from market_billing.orders paid
    where paid.provider_id=o.provider_id and paid.offer_code='pack208' and paid.loyalty_bonus_credits>0
      and paid.paid_at is not null and (paid.stripe_session is null)=simulated offset 1) then
    return o.credits+o.loyalty_bonus_credits;
  end if;
  return o.credits;
end;
$$;
revoke all on function market_billing.pack_credits(market_billing.orders,boolean) from public, anon, authenticated, service_role;

create or replace function market_billing.simulate(p_order_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare o market_billing.orders;
begin
  if not (select preview_checkout_enabled from market_billing.settings) then raise exception 'simulation_disabled'; end if;
  select * into strict o from market_billing.orders where id=p_order_id for update;
  if o.offer_code not in ('pack52','pack104','pack208') or o.stripe_session is not null or o.expired_at is not null then
    raise exception 'cannot_simulate';
  end if;
  if o.paid_at is not null then return; end if;
  if o.expires_at<=now() then raise exception 'checkout_expired'; end if;
  perform market_billing.post_entry(o.provider_id,market_billing.pack_credits(o,true),'simulation:'||o.id);
  update market_billing.orders set paid_at=now() where id=o.id;
end;
$$;

-- The caller holds the subscription's order lock. Reconcile paid cycles after
-- each newly received invoice, because older Stripe events may arrive last.
create function market_billing.credit_loyalty_cycle(o market_billing.orders,p_invoice text,p_start bigint,p_end bigint)
returns void language plpgsql set search_path='' as $$
declare prior market_billing.paid_cycles; eligible_invoice text;
begin
  if p_start is null or p_end is null or p_start<=0 or p_end<=p_start then
    raise exception 'invalid_invoice_period';
  end if;
  select * into prior from market_billing.paid_cycles where invoice=p_invoice;
  if found then
    if prior.order_id<>o.id or prior.period_start<>p_start or prior.period_end<>p_end then
      raise exception 'invoice_period_mismatch';
    end if;
    return;
  end if;
  select * into prior from market_billing.paid_cycles where order_id=o.id and period_start<p_end and period_end>p_start limit 1;
  if found then
    if prior.period_start=p_start and prior.period_end=p_end then return; end if;
    raise exception 'invoice_period_overlap';
  end if;
  insert into market_billing.paid_cycles(order_id,invoice,period_start,period_end) values(o.id,p_invoice,p_start,p_end);
  perform market_billing.post_entry(o.provider_id,o.credits,'invoice:'||p_invoice);
  -- Providers may express the last covered second inclusively or supply the next boundary.
  for eligible_invoice in
    update market_billing.paid_cycles current_cycle set bonus_awarded=true
      where current_cycle.order_id=o.id and not current_cycle.bonus_awarded
        and exists(select 1 from market_billing.paid_cycles previous_cycle
          join market_billing.paid_cycles two_back on two_back.order_id=previous_cycle.order_id
            and two_back.period_end between previous_cycle.period_start-1 and previous_cycle.period_start
          where previous_cycle.order_id=o.id and previous_cycle.period_end between current_cycle.period_start-1 and current_cycle.period_start)
      returning current_cycle.invoice
  loop
    perform market_billing.post_entry(o.provider_id,o.loyalty_bonus_credits,'loyalty:'||eligible_invoice);
  end loop;
end;
$$;
revoke all on function market_billing.credit_loyalty_cycle(market_billing.orders,text,bigint,bigint) from public,anon,authenticated,service_role;

create function market_billing.credit_payment(p_order_id uuid,p_object text,p_amount int,p_currency text,
  p_customer text,p_subscription text,p_period_start bigint,p_period_end bigint)
returns void language plpgsql security definer set search_path='' as $$
declare o market_billing.orders;
begin
  select * into strict o from market_billing.orders where id=p_order_id for update;
  if p_currency is distinct from 'cad' or p_amount is distinct from o.price_cents or
    (p_subscription is null) is distinct from (o.offer_code not in ('monthly','monthly208')) then
    raise exception 'payment_mismatch';
  end if;
  if p_subscription is null then
    if p_object is null or p_object not like 'cs\_%' or (o.stripe_session is not null and o.stripe_session<>p_object) then raise exception 'checkout_mismatch'; end if;
    if o.paid_at is not null then
      if o.stripe_session is null then raise exception 'simulated_order'; end if;
      return;
    end if;
    update market_billing.orders set stripe_session=p_object where id=o.id;
    perform market_billing.post_entry(o.provider_id,market_billing.pack_credits(o,false),'pack:'||o.id);
  else
    if p_object is null or p_object not like 'in\_%' or p_customer is null or p_subscription=''
      or (o.stripe_customer is not null and o.stripe_customer<>p_customer)
      or (o.stripe_subscription is not null and o.stripe_subscription<>p_subscription) then
      raise exception 'subscription_mismatch';
    end if;
    if o.offer_code='monthly208' then
      perform market_billing.credit_loyalty_cycle(o,p_object,p_period_start,p_period_end);
    else
      perform market_billing.post_entry(o.provider_id,o.credits,'invoice:'||p_object);
    end if;
    update market_billing.orders set stripe_customer=p_customer,stripe_subscription=p_subscription,sub_status=coalesce(sub_status,'active') where id=o.id;
  end if;
  update market_billing.orders set paid_at=coalesce(paid_at,now()) where id=o.id;
end;
$$;

-- Existing clients settle packs and the original monthly plan through the
-- six-argument RPC. The loyalty plan always requires a signed invoice period.
create or replace function market_billing.credit_payment(p_order_id uuid,p_object text,p_amount int,p_currency text,p_customer text,p_subscription text)
returns void language sql security definer set search_path='' as $$
  select market_billing.credit_payment(p_order_id,p_object,p_amount,p_currency,p_customer,p_subscription,null,null);
$$;

create function public.market_payment_credit(p_order_id uuid,p_object text,p_amount integer,p_currency text,
  p_customer text,p_subscription text,p_period_start bigint,p_period_end bigint)
returns void language sql security invoker set search_path='' as $$
  select market_billing.credit_payment(p_order_id,p_object,p_amount,p_currency,p_customer,p_subscription,p_period_start,p_period_end);
$$;
revoke all on function public.market_payment_credit(uuid,text,integer,text,text,text,bigint,bigint),
  market_billing.credit_payment(uuid,text,integer,text,text,text,bigint,bigint) from public,anon,authenticated,service_role;
grant execute on function public.market_payment_credit(uuid,text,integer,text,text,text,bigint,bigint),
  market_billing.credit_payment(uuid,text,integer,text,text,text,bigint,bigint) to service_role;

create or replace function market_billing.subscription_state(p_order_id uuid,p_subscription text,p_customer text,p_status text,p_time bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_status not in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused') then raise exception 'unknown_state'; end if;
  update market_billing.orders set stripe_subscription=p_subscription,stripe_customer=p_customer,sub_status=p_status,sub_event_at=p_time
    where id=p_order_id and offer_code in ('monthly','monthly208') and (stripe_subscription is null or stripe_subscription=p_subscription)
      and (stripe_customer is null or stripe_customer=p_customer)
      and (sub_event_at is null or sub_event_at<=p_time);
end;
$$;

commit;
