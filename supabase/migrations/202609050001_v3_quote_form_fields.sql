create or replace function public.submit_verified_quote_request(
  p_email text,
  p_token text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_id uuid := coalesce((p_payload->>'id')::uuid, gen_random_uuid());
  v_verification uuid;
begin
  select id
  into v_verification
  from public.email_verifications
  where email = lower(trim(p_email))
    and purpose = 'quote'
    and verified_at is not null
    and consumed_at is null
    and token_expires_at > now()
    and verification_token_hash = encode(digest(p_token,'sha256'),'hex')
  order by verified_at desc
  limit 1
  for update;

  if v_verification is null then
    raise exception 'EMAIL_NOT_VERIFIED';
  end if;

  insert into public.service_requests(
    id,
    first_name,
    last_name,
    email,
    phone,
    address_line,
    province,
    service_name,
    preferred_date,
    preferred_time,
    description,
    questionnaire_answers,
    preferred_language,
    status,
    source
  )
  values(
    v_id,
    p_payload->>'first_name',
    nullif(p_payload->>'last_name',''),
    lower(trim(p_email)),
    p_payload->>'phone',
    p_payload->>'address_line',
    coalesce(p_payload->>'province','Ontario'),
    nullif(p_payload->>'service_name',''),
    nullif(p_payload->>'preferred_date','')::date,
    nullif(p_payload->>'preferred_time',''),
    nullif(p_payload->>'description',''),
    coalesce(p_payload->'questionnaire_answers','{}'::jsonb),
    coalesce(p_payload->>'preferred_language','en'),
    'new',
    'website'
  );

  update public.email_verifications
  set consumed_at = now()
  where id = v_verification;

  return v_id;
end
$$;

revoke all on function public.submit_verified_quote_request(text,text,jsonb) from public;
grant execute on function public.submit_verified_quote_request(text,text,jsonb) to anon, authenticated;
