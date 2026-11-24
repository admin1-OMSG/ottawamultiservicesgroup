begin;

-- Only enabled list prices and their purchase terms may be read without a profile.
create view market_billing.public_credit_offers with (security_barrier = true) as
  select code, kind, name, price_cents, credits, loyalty_bonus_credits, enabled
  from market_billing.offers
  where enabled;

revoke all on market_billing.public_credit_offers from public, anon, authenticated, service_role;
grant select on market_billing.public_credit_offers to anon, authenticated;

-- Bind the view at definition time so anonymous callers need no billing schema access.
create function public.market_public_credit_offers() returns jsonb
language sql stable security invoker set search_path = ''
return (
  select coalesce(jsonb_agg(to_jsonb(o) order by o.kind, o.price_cents, o.code), '[]'::jsonb)
  from market_billing.public_credit_offers o
);

revoke all on function public.market_public_credit_offers() from public, anon, authenticated, service_role;
grant execute on function public.market_public_credit_offers() to anon, authenticated;

commit;
