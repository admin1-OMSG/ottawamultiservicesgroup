-- Extend the existing allowed breakdown types without changing stored rows or RLS.
begin;

alter table public.marketing_campaign_breakdown_metrics
  drop constraint if exists marketing_campaign_breakdown_metrics_breakdown_type_check;

alter table public.marketing_campaign_breakdown_metrics
  add constraint marketing_campaign_breakdown_metrics_breakdown_type_check
  check (breakdown_type in ('age', 'region', 'country', 'gender'));

commit;
