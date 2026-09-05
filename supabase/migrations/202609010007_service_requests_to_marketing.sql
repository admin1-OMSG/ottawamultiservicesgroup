-- OMSG v2.5.2 - Automatically create/update marketing leads from service requests
-- Safe trigger-based integration. Existing CRM records are not deleted.
--
-- Attribution rule:
-- A request is linked to the most recent active Meta campaign when no more
-- specific campaign attribution is available yet. This gives city-level CRM
-- funnel reporting now, while leaving room for UTM/fbclid attribution later.

create or replace function public.omsg_sync_service_request_to_marketing_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
  v_customer_id uuid;
  v_city text;
  v_province text;
  v_postal_code text;
  v_stage text := 'lead';
  v_revenue numeric := 0;
begin
  -- Use customer location when a customer is linked.
  v_customer_id := new.customer_id;

  if v_customer_id is not null then
    select c.city, c.province, c.postal_code
      into v_city, v_province, v_postal_code
    from public.customers c
    where c.id = v_customer_id;
  end if;

  -- Fall back to location stored directly on the service request, if those
  -- columns exist in this schema.
  if v_city is null then
    begin
      v_city := nullif(trim(to_jsonb(new)->>'city'), '');
      v_province := nullif(trim(to_jsonb(new)->>'province'), '');
      v_postal_code := nullif(trim(to_jsonb(new)->>'postal_code'), '');
    exception when others then
      null;
    end;
  end if;

  -- Pick the current/recent Meta campaign as a provisional attribution.
  select mc.id
    into v_campaign_id
  from public.marketing_campaigns mc
  where mc.platform = 'meta'
    and mc.external_campaign_id is not null
  order by mc.start_date desc nulls last, mc.created_at desc nulls last
  limit 1;

  -- Map request progress into the marketing funnel.
  if lower(coalesce(new.status, '')) in ('converted','completed','won','accepted') then
    v_stage := 'converted';
  elsif lower(coalesce(new.status, '')) in ('quoted','estimate_sent','quote_sent') then
    v_stage := 'quoted';
  else
    v_stage := 'lead';
  end if;

  -- Upsert by source record when the schema supports source fields.
  -- Dynamic SQL keeps this migration compatible with the existing v2.5 schema.
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='marketing_leads'
      and column_name='source_type'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='marketing_leads'
      and column_name='source_id'
  ) then
    execute $q$
      insert into public.marketing_leads
        (campaign_id, stage, converted_revenue, city, province, postal_code,
         source_type, source_id)
      values ($1,$2,$3,$4,$5,$6,'service_request',$7)
      on conflict (source_type, source_id)
      do update set
        campaign_id = coalesce(marketing_leads.campaign_id, excluded.campaign_id),
        stage = excluded.stage,
        city = coalesce(excluded.city, marketing_leads.city),
        province = coalesce(excluded.province, marketing_leads.province),
        postal_code = coalesce(excluded.postal_code, marketing_leads.postal_code)
    $q$
    using v_campaign_id, v_stage, v_revenue, v_city, v_province, v_postal_code, new.id;
  else
    -- If source columns do not exist yet, avoid duplicate creation by doing
    -- nothing here. A later attribution migration can add explicit source IDs.
    return new;
  end if;

  return new;
end
$$;

-- Install the trigger only when the source tracking columns already exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='marketing_leads'
      and column_name='source_type'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='marketing_leads'
      and column_name='source_id'
  ) then
    execute 'drop trigger if exists trg_omsg_service_request_marketing on public.service_requests';
    execute '
      create trigger trg_omsg_service_request_marketing
      after insert or update of status, customer_id
      on public.service_requests
      for each row
      execute function public.omsg_sync_service_request_to_marketing_lead()
    ';
  end if;
end
$$;
