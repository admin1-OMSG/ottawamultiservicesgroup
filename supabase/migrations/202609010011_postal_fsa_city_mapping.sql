-- OMSG v2.5.2 - Postal FSA -> city/service-area mapping
-- Adds a reusable local lookup for requests that contain only a Canadian postal code.
-- Initial verified mapping: K2W -> Kanata.
-- Safe migration: no CRM records are deleted.

create table if not exists public.postal_fsa_service_areas (
  fsa text primary key,
  city text not null,
  province text not null,
  created_at timestamptz not null default now()
);

insert into public.postal_fsa_service_areas (fsa, city, province)
values ('K2W', 'Kanata', 'Ontario')
on conflict (fsa) do update
set city = excluded.city,
    province = excluded.province;

create or replace function public.omsg_extract_canadian_fsa(value text)
returns text
language sql
immutable
as $$
  select case
    when upper(regexp_replace(coalesce(value,''), '[^A-Z0-9]', '', 'g'))
         ~ '^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$'
    then substring(
      upper(regexp_replace(coalesce(value,''), '[^A-Z0-9]', '', 'g'))
      from 1 for 3
    )
    else null
  end
$$;

-- Backfill existing marketing leads from the linked service request.
update public.marketing_leads ml
set
  city = coalesce(nullif(trim(ml.city), ''), map.city),
  province = coalesce(nullif(trim(ml.province), ''), map.province),
  postal_code = coalesce(
    nullif(trim(ml.postal_code), ''),
    case
      when public.omsg_extract_canadian_fsa(coalesce(sr.postal_code, sr.address_line)) is not null
      then upper(regexp_replace(coalesce(sr.postal_code, sr.address_line), '\s', '', 'g'))
      else null
    end
  )
from public.service_requests sr
join public.postal_fsa_service_areas map
  on map.fsa = public.omsg_extract_canadian_fsa(
    coalesce(sr.postal_code, sr.address_line)
  )
where ml.source_type = 'service_request'
  and ml.source_id = sr.id
  and nullif(trim(ml.city), '') is null;

-- Update the automatic request -> marketing lead sync so future postal-only
-- requests can resolve to a known city/service area.
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
  v_fsa text;
begin
  if new.customer_id is not null then
    select c.city, c.province, c.postal_code
      into v_city, v_province, v_postal_code
    from public.customers c
    where c.id = new.customer_id;
  end if;

  v_city := coalesce(
    nullif(trim(v_city), ''),
    nullif(trim(to_jsonb(new)->>'city'), '')
  );
  v_province := coalesce(
    nullif(trim(v_province), ''),
    nullif(trim(to_jsonb(new)->>'province'), '')
  );
  v_postal_code := coalesce(
    nullif(trim(v_postal_code), ''),
    nullif(trim(to_jsonb(new)->>'postal_code'), '')
  );

  -- Some older/public forms stored a postal code in address_line.
  if v_postal_code is null then
    if public.omsg_extract_canadian_fsa(to_jsonb(new)->>'address_line') is not null then
      v_postal_code := upper(
        regexp_replace(to_jsonb(new)->>'address_line', '\s', '', 'g')
      );
    end if;
  end if;

  -- Resolve missing city from our verified FSA lookup.
  if v_city is null then
    v_fsa := public.omsg_extract_canadian_fsa(
      coalesce(v_postal_code, to_jsonb(new)->>'address_line')
    );

    if v_fsa is not null then
      select m.city, m.province
        into v_city, v_province
      from public.postal_fsa_service_areas m
      where m.fsa = v_fsa;
    end if;
  end if;

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

-- Verification
select
  city,
  province,
  leads,
  quotes,
  customers,
  revenue
from public.marketing_city_performance
order by leads desc, revenue desc;
