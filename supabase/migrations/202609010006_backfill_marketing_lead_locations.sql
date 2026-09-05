-- OMSG v2.5.2 - Backfill marketing lead location from CRM records
-- Safe additive/update migration. It does not delete customers, requests, estimates, or marketing data.
--
-- Strategy:
-- 1) For marketing leads that are already linked to a customer, copy that customer's city/province/postal code.
-- 2) For remaining leads, if marketing_leads has an email column, try to match a customer by email.
-- 3) Existing non-empty marketing lead location values are preserved.

begin;

-- Direct customer linkage, when marketing_leads.customer_id exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='marketing_leads'
      and column_name='customer_id'
  ) then
    execute $q$
      update public.marketing_leads ml
      set
        city = coalesce(nullif(trim(ml.city), ''), c.city),
        province = coalesce(nullif(trim(ml.province), ''), c.province),
        postal_code = coalesce(nullif(trim(ml.postal_code), ''), c.postal_code)
      from public.customers c
      where ml.customer_id = c.id
        and (
          nullif(trim(ml.city), '') is null
          or nullif(trim(ml.province), '') is null
          or nullif(trim(ml.postal_code), '') is null
        )
    $q$;
  end if;
end
$$;

-- Email fallback, only if marketing_leads.email exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='marketing_leads'
      and column_name='email'
  ) then
    execute $q$
      update public.marketing_leads ml
      set
        city = coalesce(nullif(trim(ml.city), ''), c.city),
        province = coalesce(nullif(trim(ml.province), ''), c.province),
        postal_code = coalesce(nullif(trim(ml.postal_code), ''), c.postal_code)
      from public.customers c
      where lower(trim(ml.email)) = lower(trim(c.email))
        and (
          nullif(trim(ml.city), '') is null
          or nullif(trim(ml.province), '') is null
          or nullif(trim(ml.postal_code), '') is null
        )
    $q$;
  end if;
end
$$;

commit;

-- Verification
select
  coalesce(nullif(trim(city), ''), 'Unknown') as city,
  coalesce(nullif(trim(province), ''), 'Unknown') as province,
  count(*) as marketing_leads
from public.marketing_leads
group by 1,2
order by marketing_leads desc, city;
