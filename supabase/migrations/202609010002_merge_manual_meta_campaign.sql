-- OMSG v2.5 - Corrected merge migration
-- Keeps the manually created Moving campaign and links it to the imported Meta campaign.
-- Uses tolerant matching so dash/encoding differences do not matter.

begin;

do $$
declare
  v_manual_id uuid;
  v_meta_id uuid;
  v_meta_external_id text;
  v_meta_status text;
begin
  -- Find the manual campaign to keep.
  select id
    into v_manual_id
  from public.marketing_campaigns
  where external_campaign_id is null
    and lower(name) like 'moving%'
  order by start_date desc nulls last, created_at desc nulls last, id
  limit 1;

  if v_manual_id is null then
    raise exception 'Manual Moving campaign not found';
  end if;

  -- Find the most recently imported real Meta campaign.
  select id, external_campaign_id, status
    into v_meta_id, v_meta_external_id, v_meta_status
  from public.marketing_campaigns
  where platform = 'meta'
    and external_campaign_id is not null
  order by created_at desc nulls last, id
  limit 1;

  if v_meta_id is null then
    raise exception 'Imported Meta campaign not found. Run Sync Meta Ads first.';
  end if;

  if v_meta_external_id is null then
    raise exception 'Imported Meta campaign has no external_campaign_id.';
  end if;

  -- Move/merge daily metrics.
  insert into public.marketing_campaign_daily_metrics (
    campaign_id,
    metric_date,
    spend,
    impressions,
    reach,
    clicks,
    conversations,
    leads,
    raw,
    synced_at
  )
  select
    v_manual_id,
    metric_date,
    spend,
    impressions,
    reach,
    clicks,
    conversations,
    leads,
    raw,
    synced_at
  from public.marketing_campaign_daily_metrics
  where campaign_id = v_meta_id
  on conflict (campaign_id, metric_date)
  do update set
    spend = excluded.spend,
    impressions = excluded.impressions,
    reach = excluded.reach,
    clicks = excluded.clicks,
    conversations = excluded.conversations,
    leads = excluded.leads,
    raw = excluded.raw,
    synced_at = excluded.synced_at;

  delete from public.marketing_campaign_daily_metrics
  where campaign_id = v_meta_id;

  -- Reattach any leads.
  update public.marketing_leads
  set campaign_id = v_manual_id
  where campaign_id = v_meta_id;

  -- Remove duplicate imported campaign row.
  delete from public.marketing_campaigns
  where id = v_meta_id;

  -- Turn manual campaign into the canonical Meta-linked campaign.
  update public.marketing_campaigns
  set
    platform = 'meta',
    external_campaign_id = v_meta_external_id,
    status = coalesce(v_meta_status, 'active')
  where id = v_manual_id;

  raise notice 'Campaign merge completed. Canonical campaign id: %, Meta external id: %',
    v_manual_id, v_meta_external_id;
end
$$;

commit;

-- Verification
select
  id,
  name,
  platform,
  external_campaign_id,
  status,
  locations
from public.marketing_campaigns
where lower(name) like 'moving%'
   or external_campaign_id is not null
order by created_at desc nulls last, id;
