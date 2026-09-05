-- OMSG v2.5.2 - CRM city performance foundation
-- Adds city/postal tracking to marketing leads and a convenient view for city-level funnel metrics.
-- Safe additive migration: no existing rows are deleted or changed.

alter table public.marketing_leads
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists postal_code text;

create index if not exists marketing_leads_city_idx
  on public.marketing_leads(city);

create index if not exists marketing_leads_province_idx
  on public.marketing_leads(province);

create or replace view public.marketing_city_performance as
select
  coalesce(nullif(trim(city), ''), 'Unknown') as city,
  coalesce(nullif(trim(province), ''), 'Unknown') as province,
  count(*) as leads,
  count(*) filter (where stage in ('quoted','converted')) as quotes,
  count(*) filter (where stage = 'converted') as customers,
  coalesce(sum(converted_revenue), 0)::numeric(12,2) as revenue
from public.marketing_leads
group by
  coalesce(nullif(trim(city), ''), 'Unknown'),
  coalesce(nullif(trim(province), ''), 'Unknown');

grant select on public.marketing_city_performance to authenticated;
