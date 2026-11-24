-- Professional onboarding is independent of the existing CRM partner records.
-- Approval means OMSG reviewed the submitted dossier; it does not represent an
-- external identity, criminal-record, insurance, or trade-licence verification.
begin;

create schema professional_private;
revoke all on schema professional_private from public, anon, authenticated;
grant usage on schema professional_private to authenticated;

create table public.professional_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  account_type text not null default 'individual' check (account_type in ('company', 'individual')),
  business_name text not null default '' check (length(business_name) <= 160),
  contact_name text not null default '' check (length(contact_name) <= 160),
  phone text not null default '' check (length(phone) <= 40),
  city text not null default '' check (length(city) <= 120),
  province text not null default '' check (province in ('', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
  postal_code text not null default '' check (length(postal_code) <= 10),
  website text not null default '' check (length(website) <= 500 and (website = '' or website ~ '^https?://[^[:space:]]+$')),
  services text[] not null default '{}' check (cardinality(services) <= 30),
  service_areas text[] not null default '{}' check (cardinality(service_areas) <= 30),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'fr')),
  review_status text not null default 'draft' check (review_status in ('draft', 'pending_review', 'changes_requested', 'approved', 'suspended')),
  review_message text check (length(review_message) <= 2000),
  submitted_at timestamptz,
  attested_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index professional_accounts_review_queue_idx
  on public.professional_accounts (review_status, submitted_at desc);

create table public.professional_documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.professional_accounts(id) on delete cascade,
  category text not null check (category in ('business_registration', 'insurance', 'trade_licence', 'other')),
  storage_path text not null unique,
  file_name text not null check (length(file_name) between 1 and 200 and file_name !~ '[[:cntrl:]/\\]'),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size bigint not null check (file_size > 0 and file_size <= 8388608),
  created_at timestamptz not null default now()
);
create index professional_documents_account_idx on public.professional_documents(account_id, created_at);

create table public.professional_review_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.professional_accounts(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  reviewer_id uuid references auth.users(id) on delete set null,
  message text not null check (length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index professional_review_events_account_idx on public.professional_review_events(account_id, created_at desc);

-- Only these helpers run with elevated privileges. They are outside exposed
-- schemas, validate the current auth.uid(), and have a fixed empty search_path.
create function professional_private.is_active_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.admin_users where id = auth.uid() and is_active = true
  );
$$;

create function professional_private.verified_email()
returns text language plpgsql stable security definer set search_path = ''
as $$
declare v_email text;
begin
  if auth.uid() is null then raise exception 'professional_auth_required' using errcode = '42501'; end if;
  select lower(email) into v_email from auth.users
    where id = auth.uid() and email_confirmed_at is not null
      and coalesce(is_anonymous, false) = false;
  if v_email is null then raise exception 'professional_verified_email_required' using errcode = '42501'; end if;
  return v_email;
end;
$$;

create function professional_private.profile_labels(p_value jsonb, p_field text)
returns text[] language plpgsql immutable set search_path = ''
as $$
declare v_result text[]; v_item jsonb;
begin
  if p_value is null then return '{}'::text[]; end if;
  if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) > 30 then
    raise exception 'professional_invalid_%', p_field using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_value) loop
    if jsonb_typeof(v_item) <> 'string' or length(btrim(v_item #>> '{}')) not between 1 and 100 then
      raise exception 'professional_invalid_%', p_field using errcode = '22023';
    end if;
  end loop;
  select coalesce(array_agg(label order by first_position), '{}'::text[]) into v_result
  from (select btrim(value) as label, min(ordinality) as first_position
        from jsonb_array_elements_text(p_value) with ordinality group by btrim(value)) labels;
  return v_result;
end;
$$;

create function professional_private.save_account(p_profile jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_email text; v_account public.professional_accounts%rowtype; v_key text;
begin
  v_email := professional_private.verified_email();
  if jsonb_typeof(p_profile) is distinct from 'object' then
    raise exception 'professional_invalid_profile' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_profile) loop
    if v_key <> all(array['account_type','business_name','contact_name','phone','city','province','postal_code','website','services','service_areas','preferred_language']) then
      raise exception 'professional_profile_field_not_editable' using errcode = '42501';
    end if;
    if v_key not in ('services', 'service_areas') and jsonb_typeof(p_profile -> v_key) <> 'string'
      and not (v_key = 'website' and jsonb_typeof(p_profile -> v_key) = 'null') then
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
    services = professional_private.profile_labels(p_profile -> 'services', 'services'),
    service_areas = professional_private.profile_labels(p_profile -> 'service_areas', 'service_areas'),
    preferred_language = coalesce(p_profile ->> 'preferred_language', 'en'),
    attested_at = null,
    updated_at = clock_timestamp()
  where id = v_account.id;
  return v_account.id;
end;
$$;

create function professional_private.submit_account()
returns void language plpgsql security definer set search_path = ''
as $$
declare v_account public.professional_accounts%rowtype; v_email text;
begin
  v_email := professional_private.verified_email();
  select * into v_account from public.professional_accounts where user_id = auth.uid() for update;
  if not found then raise exception 'professional_account_required' using errcode = '22023'; end if;
  if v_account.review_status not in ('draft', 'changes_requested') then
    raise exception 'professional_profile_locked' using errcode = '42501';
  end if;
  if v_account.contact_name = '' or v_account.city = '' or v_account.province = ''
    or (v_account.account_type = 'company' and v_account.business_name = '')
    or length(regexp_replace(v_account.phone, '[^0-9]', '', 'g')) not between 7 and 15
    or v_account.postal_code !~ '^[A-Z][0-9][A-Z] ?[0-9][A-Z][0-9]$'
    or cardinality(v_account.services) = 0 or cardinality(v_account.service_areas) = 0 then
    raise exception 'professional_profile_incomplete' using errcode = '22023';
  end if;
  if exists (select 1 from public.professional_documents d where d.account_id = v_account.id and not exists (
      select 1 from storage.objects o where o.bucket_id = 'professional-documents' and o.name = d.storage_path
    )) then
    raise exception 'professional_document_missing' using errcode = '22023';
  end if;
  update public.professional_accounts set email = v_email, review_status = 'pending_review',
    submitted_at = now(), attested_at = now(), reviewed_at = null, reviewed_by = null,
    review_message = null, updated_at = clock_timestamp() where id = v_account.id;
end;
$$;

create function professional_private.review_account(p_account_id uuid, p_decision text, p_expected_updated_at timestamptz, p_message text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_status text; v_updated_at timestamptz; v_message text := btrim(coalesce(p_message, ''));
begin
  if not professional_private.is_active_admin() then raise exception 'professional_admin_required' using errcode = '42501'; end if;
  if p_decision is null or p_decision not in ('approved', 'changes_requested', 'suspended') then
    raise exception 'professional_invalid_review_decision' using errcode = '22023';
  end if;
  if length(v_message) not between 1 and 2000 then
    raise exception 'professional_review_message_required' using errcode = '22023';
  end if;
  select review_status, updated_at into v_status, v_updated_at from public.professional_accounts where id = p_account_id for update;
  if not found then raise exception 'professional_account_not_found' using errcode = '22023'; end if;
  if p_expected_updated_at is null or v_updated_at is distinct from p_expected_updated_at then
    raise exception 'professional_review_stale' using errcode = '40001';
  end if;
  if (p_decision = 'approved' and v_status <> 'pending_review')
    or (p_decision = 'changes_requested' and v_status not in ('pending_review', 'approved', 'suspended'))
    or p_decision = v_status then
    raise exception 'professional_invalid_review_transition' using errcode = '22023';
  end if;
  update public.professional_accounts set review_status = p_decision, review_message = v_message,
    reviewed_at = now(), reviewed_by = auth.uid(), updated_at = clock_timestamp() where id = p_account_id;
  insert into public.professional_review_events(account_id, from_status, to_status, reviewer_id, message)
    values(p_account_id, v_status, p_decision, auth.uid(), v_message);
end;
$$;

create function professional_private.valid_document_path(p_path text)
returns boolean language sql immutable set search_path = ''
as $$
  select p_path ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](pdf|jpe?g|png)$';
$$;

create function professional_private.can_read_document(p_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and professional_private.valid_document_path(p_path) and (
    professional_private.is_active_admin() or exists (
      select 1 from public.professional_accounts a
      where a.user_id = auth.uid() and a.user_id::text = split_part(p_path, '/', 1)
        and a.id::text = split_part(p_path, '/', 2)
    )
  );
$$;

create function professional_private.can_edit_document(p_path text)
returns boolean language plpgsql volatile security definer set search_path = ''
as $$
declare v_status text;
begin
  if auth.uid() is null or p_path is null or not professional_private.valid_document_path(p_path)
    or split_part(p_path, '/', 1) <> auth.uid()::text then return false; end if;
  -- Lock the account for the Storage transaction, so submit/review cannot race
  -- an object mutation and leave an approved dossier with substituted files.
  select review_status into v_status from public.professional_accounts a
    where a.user_id = auth.uid() and a.id::text = split_part(p_path, '/', 2) for update;
  return coalesce(v_status in ('draft', 'changes_requested'), false);
end;
$$;

create function professional_private.can_upload_document(p_path text)
returns boolean language plpgsql volatile security definer set search_path = ''
as $$
begin
  -- The lock acquired by can_edit_document serializes uploads and submission.
  -- Count stored objects, not just registered metadata, to bound orphan uploads.
  if not professional_private.can_edit_document(p_path) then return false; end if;
  return (select count(*) from storage.objects
    where bucket_id = 'professional-documents'
      and split_part(name, '/', 1) = split_part(p_path, '/', 1)
      and split_part(name, '/', 2) = split_part(p_path, '/', 2)) < 10;
end;
$$;

create function professional_private.register_document(p_category text, p_storage_path text, p_file_name text, p_mime_type text, p_file_size bigint)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_account_id uuid; v_id uuid; v_metadata jsonb;
begin
  perform professional_private.verified_email();
  if not professional_private.can_edit_document(p_storage_path) then
    raise exception 'professional_document_not_editable' using errcode = '42501';
  end if;
  select id into v_account_id from public.professional_accounts where user_id = auth.uid();
  select metadata into v_metadata from storage.objects
    where bucket_id = 'professional-documents' and name = p_storage_path;
  if not found then raise exception 'professional_document_missing' using errcode = '22023'; end if;
  if v_metadata ->> 'mimetype' is distinct from p_mime_type
    or (v_metadata ->> 'size')::bigint is distinct from p_file_size
    or not ((p_mime_type = 'application/pdf' and p_storage_path ~ '[.]pdf$')
      or (p_mime_type = 'image/jpeg' and p_storage_path ~ '[.]jpe?g$')
      or (p_mime_type = 'image/png' and p_storage_path ~ '[.]png$')) then
    raise exception 'professional_document_metadata_mismatch' using errcode = '22023';
  end if;
  select id into v_id from public.professional_documents where storage_path = p_storage_path;
  if found then return v_id; end if;
  if (select count(*) from public.professional_documents where account_id = v_account_id) >= 10 then
    raise exception 'professional_document_limit_reached' using errcode = '22023';
  end if;
  insert into public.professional_documents(account_id, category, storage_path, file_name, mime_type, file_size)
    values(v_account_id, p_category, p_storage_path, btrim(p_file_name), p_mime_type, p_file_size) returning id into v_id;
  return v_id;
end;
$$;

create function professional_private.remove_document(p_document_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_document public.professional_documents%rowtype;
begin
  perform professional_private.verified_email();
  select d.* into v_document from public.professional_documents d
    join public.professional_accounts a on a.id = d.account_id
    where d.id = p_document_id and a.user_id = auth.uid();
  if not found then raise exception 'professional_document_not_found' using errcode = '42501'; end if;
  if not professional_private.can_edit_document(v_document.storage_path) then
    raise exception 'professional_document_not_editable' using errcode = '42501';
  end if;
  if exists(select 1 from storage.objects where bucket_id = 'professional-documents' and name = v_document.storage_path) then
    raise exception 'professional_remove_stored_file_first' using errcode = '22023';
  end if;
  delete from public.professional_documents where id = p_document_id;
end;
$$;

-- Browser tables are read-only; all writes use the authenticated RPCs below.
alter table public.professional_accounts enable row level security;
alter table public.professional_documents enable row level security;
alter table public.professional_review_events enable row level security;
revoke all on public.professional_accounts, public.professional_documents, public.professional_review_events from public, anon, authenticated;
grant select on public.professional_accounts, public.professional_documents, public.professional_review_events to authenticated;
create policy "Professional owners and admins read accounts" on public.professional_accounts for select to authenticated
  using (user_id = (select auth.uid()) or (select professional_private.is_active_admin()));
create policy "Professional owners and admins read document metadata" on public.professional_documents for select to authenticated
  using (exists (select 1 from public.professional_accounts a where a.id = account_id and a.user_id = (select auth.uid()))
    or (select professional_private.is_active_admin()));
create policy "Active admins read professional review history" on public.professional_review_events for select to authenticated
  using ((select professional_private.is_active_admin()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('professional-documents', 'professional-documents', false, 8388608, array['application/pdf', 'image/jpeg', 'image/png']);

create policy "Professional documents read" on storage.objects for select to authenticated
  using (bucket_id = 'professional-documents' and professional_private.can_read_document(name));
create policy "Professional documents upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'professional-documents' and professional_private.can_upload_document(name));
create policy "Professional documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'professional-documents' and professional_private.can_edit_document(name));
-- Restrictive fences prevent unrelated permissive Storage policies from opening
-- this private bucket. Upsert/overwrite is deliberately unsupported.
create policy "Professional documents anon boundary" on storage.objects as restrictive for all to anon
  using (bucket_id <> 'professional-documents') with check (bucket_id <> 'professional-documents');
create policy "Professional documents read boundary" on storage.objects as restrictive for select to authenticated
  using (bucket_id <> 'professional-documents' or professional_private.can_read_document(name));
create policy "Professional documents upload boundary" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'professional-documents' or professional_private.can_upload_document(name));
create policy "Professional documents delete boundary" on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'professional-documents' or professional_private.can_edit_document(name));
create policy "Professional documents overwrite boundary" on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'professional-documents') with check (bucket_id <> 'professional-documents');

create function public.save_my_professional_account(p_profile jsonb)
returns uuid language sql security invoker set search_path = ''
as $$ select professional_private.save_account(p_profile); $$;
create function public.submit_my_professional_account()
returns void language sql security invoker set search_path = ''
as $$ select professional_private.submit_account(); $$;
create function public.review_professional_account(p_account_id uuid, p_decision text, p_expected_updated_at timestamptz, p_message text default null)
returns void language sql security invoker set search_path = ''
as $$ select professional_private.review_account(p_account_id, p_decision, p_expected_updated_at, p_message); $$;
create function public.register_my_professional_document(p_category text, p_storage_path text, p_file_name text, p_mime_type text, p_file_size bigint)
returns uuid language sql security invoker set search_path = ''
as $$ select professional_private.register_document(p_category, p_storage_path, p_file_name, p_mime_type, p_file_size); $$;
create function public.remove_my_professional_document(p_document_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select professional_private.remove_document(p_document_id); $$;

revoke all on all functions in schema professional_private from public, anon, authenticated;
grant execute on function professional_private.is_active_admin(), professional_private.can_read_document(text), professional_private.can_edit_document(text), professional_private.can_upload_document(text),
  professional_private.save_account(jsonb), professional_private.submit_account(), professional_private.review_account(uuid,text,timestamptz,text),
  professional_private.register_document(text,text,text,text,bigint), professional_private.remove_document(uuid) to authenticated;
revoke all on function public.save_my_professional_account(jsonb), public.submit_my_professional_account(),
  public.review_professional_account(uuid,text,timestamptz,text), public.register_my_professional_document(text,text,text,text,bigint),
  public.remove_my_professional_document(uuid) from public, anon, authenticated;
grant execute on function public.save_my_professional_account(jsonb), public.submit_my_professional_account(),
  public.review_professional_account(uuid,text,timestamptz,text), public.register_my_professional_document(text,text,text,text,bigint),
  public.remove_my_professional_document(uuid) to authenticated;

commit;
