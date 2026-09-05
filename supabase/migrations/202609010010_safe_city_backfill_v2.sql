-- OMSG v2.5.2 - Safe city backfill v2
-- Avoids ON CONFLICT entirely to stay compatible with the current schema/indexes.
-- Safe: no CRM records are deleted and no request is falsely attributed to Meta.

create or replace function public.omsg_sync_service_request_to_marketing_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city text;
  v_province text;
  v_postal_code text;
  v_stage text := 'lead';
begin
  if new.customer_id is not null then
    select c.city, c.province, c.postal_code
      into v_city, v_province, v_postal_code
    from public.customers c
    where c.id = new.customer_id;
  end if;

  v_city := coalesce(nullif(trim(v_city), ''), nullif(trim(to_jsonb(new)->>'city'), ''));
  v_province := coalesce(nullif(trim(v_province), ''), nullif(trim(to_jsonb(new)->>'province'), ''));
  v_postal_code := coalesce(nullif(trim(v_postal_code), ''), nullif(trim(to_jsonb(new)->>'postal_code'), ''));

  if lower(coalesce(new.status, '')) in ('converted','completed','won','accepted') then
    v_stage := 'converted';
  elsif lower(coalesce(new.status, '')) in ('quoted','estimate_sent','quote_sent') then
    v_stage := 'quoted';
  else
    v_stage := 'lead';
  end if;

  update public.marketing_leads
  set
    stage = v_stage,
    city = coalesce(v_city, city),
    province = coalesce(v_province, province),
    postal_code = coalesce(v_postal_code, postal_code)
  where source_type = 'service_request'
    and source_id = new.id;

  if not found then
    insert into public.marketing_leads (
      campaign_id,
      stage,
      converted_revenue,
      city,
      province,
      postal_code,
      source_type,
      source_id
    )
    values (
      null,
      v_stage,
      0,
      v_city,
      v_province,
      v_postal_code,
      'service_request',
      new.id
    );
  end if;

  return new;
end
$$;

drop trigger if exists trg_omsg_service_request_marketing
  on public.service_requests;

create trigger trg_omsg_service_request_marketing
after insert or update of status, customer_id
on public.service_requests
for each row
execute function public.omsg_sync_service_request_to_marketing_lead();

-- Backfill existing requests using UPDATE first, then INSERT missing rows.

update public.marketing_leads ml
set
  stage = case
    when lower(coalesce(sr.status,'')) in ('converted','completed','won','accepted') then 'converted'
    when lower(coalesce(sr.status,'')) in ('quoted','estimate_sent','quote_sent') then 'quoted'
    else 'lead'
  end,
  city = coalesce(nullif(trim(c.city),''), nullif(trim(sr.city),''), ml.city),
  province = coalesce(nullif(trim(c.province),''), nullif(trim(sr.province),''), ml.province),
  postal_code = coalesce(nullif(trim(c.postal_code),''), nullif(trim(sr.postal_code),''), ml.postal_code)
from public.service_requests sr
left join public.customers c on c.id = sr.customer_id
where ml.source_type = 'service_request'
  and ml.source_id = sr.id;

insert into public.marketing_leads (
  campaign_id,
  stage,
  converted_revenue,
  city,
  province,
  postal_code,
  source_type,
  source_id
)
select
  null,
  case
    when lower(coalesce(sr.status,'')) in ('converted','completed','won','accepted') then 'converted'
    when lower(coalesce(sr.status,'')) in ('quoted','estimate_sent','quote_sent') then 'quoted'
    else 'lead'
  end,
  0,
  coalesce(nullif(trim(c.city),''), nullif(trim(sr.city),'')),
  coalesce(nullif(trim(c.province),''), nullif(trim(sr.province),'')),
  coalesce(nullif(trim(c.postal_code),''), nullif(trim(sr.postal_code),'')),
  'service_request',
  sr.id
from public.service_requests sr
left join public.customers c on c.id = sr.customer_id
where not exists (
  select 1
  from public.marketing_leads ml
  where ml.source_type = 'service_request'
    and ml.source_id = sr.id
);

-- Verification
select
  coalesce(nullif(trim(city), ''), 'Unknown') as city,
  coalesce(nullif(trim(province), ''), 'Unknown') as province,
  count(*) as leads
from public.marketing_leads
where source_type = 'service_request'
group by 1,2
order by leads desc, city;
