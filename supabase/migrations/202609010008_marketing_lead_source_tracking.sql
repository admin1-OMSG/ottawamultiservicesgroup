-- OMSG v2.5.2 - Add source tracking for marketing leads
-- Safe additive migration.
-- Adds source_type/source_id so CRM records can upsert into marketing_leads
-- without creating duplicates.

alter table public.marketing_leads
  add column if not exists source_type text,
  add column if not exists source_id uuid;

create unique index if not exists marketing_leads_source_unique
  on public.marketing_leads(source_type, source_id)
  where source_type is not null and source_id is not null;

create index if not exists marketing_leads_source_type_idx
  on public.marketing_leads(source_type);

-- Recreate the service request -> marketing lead trigger now that source tracking exists.
drop trigger if exists trg_omsg_service_request_marketing
  on public.service_requests;

create trigger trg_omsg_service_request_marketing
after insert or update of status, customer_id
on public.service_requests
for each row
execute function public.omsg_sync_service_request_to_marketing_lead();

-- Verification
select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'marketing_leads'
  and column_name in ('source_type','source_id')
order by column_name;
