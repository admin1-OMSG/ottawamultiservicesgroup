begin;

-- Use the most common configured tariff. At equal frequency use the higher cost.
create or replace view market_billing.public_credit_offers with (security_barrier = true) as
  select o.code, o.kind, o.name, o.price_cents, o.credits, o.loyalty_bonus_credits, o.enabled,
    (
      select t.credits
      from market_billing.tariffs t
      where t.credits > 0
      group by t.credits
      order by count(*) desc, t.credits desc
      limit 1
    ) as example_contact_credits
  from market_billing.offers o
  where o.enabled;

commit;
