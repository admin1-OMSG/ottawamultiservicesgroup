-- CRM v1.9 - verified email submissions
create extension if not exists pgcrypto;

create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('quote','partner_service_provider','partner_subcontracting')),
  code_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts integer not null default 0,
  verified_at timestamptz,
  verification_token_hash text,
  token_expires_at timestamptz,
  consumed_at timestamptz,
  invalidated_at timestamptz
);
create index if not exists email_verifications_lookup_idx on public.email_verifications(email,purpose,created_at desc);
alter table public.email_verifications enable row level security;
-- No browser policies: only service-role Edge Functions and SECURITY DEFINER submission RPCs access this table.
revoke all on public.email_verifications from anon, authenticated;

create or replace function public.submit_verified_quote_request(p_email text, p_token text, p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare v_id uuid := coalesce((p_payload->>'id')::uuid, gen_random_uuid()); v_verification uuid;
begin
  select id into v_verification from public.email_verifications
  where email=lower(trim(p_email)) and purpose='quote' and verified_at is not null and consumed_at is null
    and token_expires_at > now() and verification_token_hash=encode(digest(p_token,'sha256'),'hex')
  order by verified_at desc limit 1 for update;
  if v_verification is null then raise exception 'EMAIL_NOT_VERIFIED'; end if;
  insert into public.service_requests(id,first_name,last_name,email,phone,address_line,province,service_name,description,questionnaire_answers,preferred_language,status,source)
  values(v_id,p_payload->>'first_name',nullif(p_payload->>'last_name',''),lower(trim(p_email)),p_payload->>'phone',p_payload->>'address_line',coalesce(p_payload->>'province','Ontario'),nullif(p_payload->>'service_name',''),nullif(p_payload->>'description',''),coalesce(p_payload->'questionnaire_answers','{}'::jsonb),coalesce(p_payload->>'preferred_language','en'),'new','website');
  update public.email_verifications set consumed_at=now() where id=v_verification;
  return v_id;
end $$;

create or replace function public.submit_verified_partner_application(p_email text, p_purpose text, p_token text, p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare v_id uuid := coalesce((p_payload->>'id')::uuid, gen_random_uuid()); v_verification uuid; v_type text;
begin
  if p_purpose not in ('partner_service_provider','partner_subcontracting') then raise exception 'INVALID_PURPOSE'; end if;
  v_type := case when p_purpose='partner_subcontracting' then 'subcontracting_client' else 'service_provider' end;
  select id into v_verification from public.email_verifications
  where email=lower(trim(p_email)) and purpose=p_purpose and verified_at is not null and consumed_at is null
    and token_expires_at > now() and verification_token_hash=encode(digest(p_token,'sha256'),'hex')
  order by verified_at desc limit 1 for update;
  if v_verification is null then raise exception 'EMAIL_NOT_VERIFIED'; end if;
  insert into public.partner_applications(id,application_type,applicant_type,contact_first_name,contact_last_name,business_name,email,phone,service_areas,availability,preferred_language,city,project_location,frequency,start_date,desired_rate,estimated_contract_value,details)
  values(v_id,v_type,p_payload->>'applicant_type',p_payload->>'contact_first_name',coalesce(nullif(p_payload->>'contact_last_name',''),'Not provided'),p_payload->>'business_name',lower(trim(p_email)),p_payload->>'phone',coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'service_areas','[]'::jsonb))),'{}'),nullif(p_payload->>'availability',''),coalesce(p_payload->>'preferred_language','en'),nullif(p_payload->>'city',''),nullif(p_payload->>'project_location',''),nullif(p_payload->>'frequency',''),nullif(p_payload->>'start_date','')::date,nullif(p_payload->>'desired_rate','')::numeric,nullif(p_payload->>'estimated_contract_value','')::numeric,nullif(p_payload->>'details',''));
  update public.email_verifications set consumed_at=now() where id=v_verification;
  return v_id;
end $$;

revoke all on function public.submit_verified_quote_request(text,text,jsonb) from public;
revoke all on function public.submit_verified_partner_application(text,text,text,jsonb) from public;
grant execute on function public.submit_verified_quote_request(text,text,jsonb) to anon, authenticated;
grant execute on function public.submit_verified_partner_application(text,text,text,jsonb) to anon, authenticated;

-- Force public website submissions through the verified RPCs. Existing admin/authenticated policies remain unchanged.
revoke insert on public.service_requests from anon;
revoke insert on public.partner_applications from anon;
