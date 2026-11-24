-- The optional link belongs to the professional. OMSG does not store Google Maps content.
alter table public.professional_accounts add column google_maps_url text
  constraint professional_google_maps_url_valid check (
    google_maps_url is null or (
      length(google_maps_url) <= 2048 and google_maps_url !~ '[[:space:]]'
      and strpos(google_maps_url, chr(92)) = 0
      and (google_maps_url ~ '^https://maps[.]app[.]goo[.]gl/[A-Za-z0-9_-]+/?$'
        or google_maps_url ~ '^https://goo[.]gl/maps/[A-Za-z0-9_-]+/?$'
        or google_maps_url ~ '^https://((www|maps)[.])?google[.](com|ca)/maps/(place|search)/'
        or google_maps_url ~ '^https://((www|maps)[.])?google[.](com|ca)/maps/?[?]cid=[0-9]+$'
        or google_maps_url ~ '^https://maps[.]google[.](com|ca)/[?]cid=[0-9]+$')
    )
  );

create or replace function professional_private.save_account(p_profile jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_email text; v_account public.professional_accounts%rowtype; v_key text;
begin
  v_email := professional_private.verified_email();
  if jsonb_typeof(p_profile) is distinct from 'object' then
    raise exception 'professional_invalid_profile' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_profile) loop
    if v_key <> all(array['account_type','business_name','contact_name','phone','city','province','postal_code','website','google_maps_url','services','service_areas','preferred_language']) then
      raise exception 'professional_profile_field_not_editable' using errcode = '42501';
    end if;
    if v_key not in ('services', 'service_areas') and jsonb_typeof(p_profile -> v_key) <> 'string'
      and not (v_key in ('website','google_maps_url') and jsonb_typeof(p_profile -> v_key) = 'null') then
      raise exception 'professional_invalid_profile' using errcode = '22023';
    end if;
  end loop;
  -- Serialize first creation and updates for one auth user, including requests
  -- arriving before an account row exists. No email-based CRM claiming occurs.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 762023));
  select * into v_account from public.professional_accounts where user_id = auth.uid() for update;
  if found and v_account.review_status not in ('draft', 'changes_requested') then
    raise exception 'professional_profile_locked' using errcode = '42501';
  end if;
  if v_account.id is null then
    insert into public.professional_accounts(user_id, email) values(auth.uid(), v_email) returning * into v_account;
  end if;
  update public.professional_accounts set
    email = v_email,
    account_type = coalesce(p_profile ->> 'account_type', 'individual'),
    business_name = btrim(coalesce(p_profile ->> 'business_name', '')),
    contact_name = btrim(coalesce(p_profile ->> 'contact_name', '')),
    phone = btrim(coalesce(p_profile ->> 'phone', '')),
    city = btrim(coalesce(p_profile ->> 'city', '')),
    province = upper(btrim(coalesce(p_profile ->> 'province', ''))),
    postal_code = upper(btrim(coalesce(p_profile ->> 'postal_code', ''))),
    website = btrim(coalesce(p_profile ->> 'website', '')),
    google_maps_url = case when p_profile ? 'google_maps_url' then nullif(btrim(p_profile ->> 'google_maps_url'), '')
      else v_account.google_maps_url end,
    services = professional_private.profile_labels(p_profile -> 'services', 'services'),
    service_areas = professional_private.profile_labels(p_profile -> 'service_areas', 'service_areas'),
    preferred_language = coalesce(p_profile ->> 'preferred_language', 'en'),
    attested_at = null,
    updated_at = clock_timestamp()
  where id = v_account.id;
  return v_account.id;
end;
$$;
