begin;
-- A browser may return before Stripe's completion webhook. Never start a second
-- monthly subscription until Stripe confirms the existing session expired.
create or replace function market_billing.begin_purchase(p_user_id uuid,p_code text,p_attempt uuid,p_lead uuid) returns jsonb
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
          or (sub_status is null and (paid_at is not null or stripe_session is not null or expires_at>now())))
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
  if ord.expired_at is not null or (ord.paid_at is null and ord.stripe_session is null and ord.expires_at<=now()) then raise exception 'checkout_expired'; end if;
  return to_jsonb(ord)||jsonb_build_object('kind',o.kind,'name',o.name,'email',p.email,
    'preview_checkout_enabled',(select preview_checkout_enabled from market_billing.settings));
end;
$$;

commit;
