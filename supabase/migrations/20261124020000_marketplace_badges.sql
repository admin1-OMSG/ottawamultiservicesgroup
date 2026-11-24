begin;

-- Supplements are separate from the original description, so a status change,
-- invitation or initial publication can never mark a request as updated.
create table market_private.request_details (
  id uuid primary key,
  request_id uuid not null references market_private.requests(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp()
);
create index market_request_details_by_request on market_private.request_details(request_id,created_at,id);
alter table market_private.request_details enable row level security;
revoke all on market_private.request_details from public,anon,authenticated,service_role;

create function market_private.add_request_details(p_request_id uuid,p_id uuid,p_details text)
returns void language plpgsql security definer set search_path='' as $$
declare
  req market_private.requests;
  previous market_private.request_details;
  details text := regexp_replace(p_details,'^[[:space:]]+|[[:space:]]+$','','g');
begin
  select * into req from market_private.requests where id=p_request_id and client_id=auth.uid() for update;
  if not found then raise exception 'market_request_unavailable' using errcode='42501'; end if;
  if p_id is null or details is null or length(details) not between 1 and 2000 then
    raise exception 'market_invalid_details' using errcode='22023';
  end if;
  select * into previous from market_private.request_details where id=p_id;
  if found then
    if previous.request_id=p_request_id and previous.body=details then return; end if;
    raise exception 'market_invalid_details' using errcode='22023';
  end if;
  if req.status<>'open' then raise exception 'market_request_closed' using errcode='22023'; end if;
  if req.description=details or exists(select 1 from market_private.request_details d where d.request_id=req.id and d.body=details) then
    raise exception 'market_duplicate_details' using errcode='22023';
  end if;
  insert into market_private.request_details(id,request_id,body) values(p_id,p_request_id,details);
  perform market_private.touch();
end; $$;

create function public.market_add_request_details(p_request_id uuid,p_id uuid,p_details text)
returns void language sql security invoker set search_path='' as $$
  select market_private.add_request_details(p_request_id,p_id,p_details);
$$;
revoke all on function public.market_add_request_details(uuid,uuid,text),market_private.add_request_details(uuid,uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.market_add_request_details(uuid,uuid,text),market_private.add_request_details(uuid,uuid,text)
  to authenticated;

-- An invoice settlement and the current subscription event are independent.
-- The badge needs both, including for orders that predate this migration.
create function market_billing.is_paid_subscriber(p_provider_id uuid) returns boolean
language sql stable set search_path='' as $$
  select exists (
    select 1 from market_billing.orders o join market_billing.offers f on f.code=o.offer_code
    where o.provider_id=p_provider_id and f.kind='subscription' and o.paid_at is not null
      and nullif(o.stripe_subscription,'') is not null and o.sub_status='active' and o.expired_at is null
  );
$$;
revoke all on function market_billing.is_paid_subscriber(uuid) from public,anon,authenticated,service_role;

-- The pilot accepts Canadian national-format profile numbers. For any other
-- country require the full number, including its country calling code.
create function market_private.profile_phone_verified(p_profile text,p_auth text,p_confirmed timestamptz)
returns boolean language sql immutable set search_path='' as $$
  select coalesce(p_confirmed is not null and p_profile ~ '^[+0-9().[:space:]-]+$' and
    digits.verified ~ '^[1-9][0-9]{6,14}$' and (
      digits.declared=digits.verified or digits.declared='00'||digits.verified or
      (length(digits.declared)=10 and ltrim(p_profile) not like '+%' and digits.verified='1'||digits.declared)
    ),false)
  from (select regexp_replace(p_profile,'[^0-9]','','g') as declared,
               regexp_replace(p_auth,'[^0-9]','','g') as verified) digits;
$$;
revoke all on function market_private.profile_phone_verified(text,text,timestamptz) from public,anon,authenticated,service_role;

-- Extend only rows visible through the established marketplace projections.
-- Versioned reads let already-running clients finish on the original API.
create function market_private.requests_v2() returns table (
  id uuid,service text,city text,title text,description text,urgency text,status text,credit_cost int,
  created_at timestamptz,client_active_at timestamptz,email_verified boolean,phone_verified boolean,
  preferred_ids uuid[],preferred_names text[],is_owner boolean,matched boolean,invited boolean,
  repeat_client boolean,details_updated_at timestamptz
) language sql stable security definer set search_path='' as $$
  select v.id,v.service,v.city,v.title,concat_ws(E'\n\n',v.description,details.body),v.urgency,v.status,
    v.credit_cost,v.created_at,v.client_active_at,v.email_verified,v.phone_verified and coalesce(u.phone ~ '[0-9]',false),
    v.preferred_ids,v.preferred_names,v.is_owner,v.matched,v.invited,
    exists(select 1 from market_private.requests history where history.client_id=r.client_id offset 3),details.last_added
  from market_private.requests() v join market_private.requests r on r.id=v.id
  join auth.users u on u.id=r.client_id
  left join lateral (
    select string_agg(d.body,E'\n\n' order by d.created_at,d.id) as body,max(d.created_at) as last_added
    from market_private.request_details d where d.request_id=r.id
  ) details on true
  order by v.created_at desc,v.id;
$$;

create function market_private.directory_v2() returns table (
  id uuid,name text,services text[],service_areas text[],city text,review_status text,active_at timestamptz,
  completed_count int,review_count int,average_rating numeric,google_maps_url text,paid_subscriber boolean,phone_verified boolean
) language sql stable security definer set search_path='' as $$
  select v.*,market_billing.is_paid_subscriber(a.id),market_private.profile_phone_verified(a.phone,u.phone,u.phone_confirmed_at)
  from market_private.directory() v join public.professional_accounts a on a.id=v.id join auth.users u on u.id=a.user_id
  order by v.name,v.id;
$$;

create function market_private.my_contacts_v2() returns table (
  id uuid,request_id uuid,provider_id uuid,provider_name text,request_title text,credit_cost int,created_at timestamptz,
  completed_at timestamptz,review_rating int,review_body text,client_email text,client_phone text,my_provider boolean,
  provider_paid_subscriber boolean,provider_phone_verified boolean
) language sql stable security definer set search_path='' as $$
  select v.*,market_billing.is_paid_subscriber(a.id),market_private.profile_phone_verified(a.phone,u.phone,u.phone_confirmed_at)
  from market_private.my_contacts() v join public.professional_accounts a on a.id=v.provider_id join auth.users u on u.id=a.user_id
  order by v.created_at desc,v.id;
$$;

do $$
declare f record;
begin
  for f in select p.proname,pg_get_function_result(p.oid) as result
    from pg_proc p where p.pronamespace='market_private'::regnamespace and p.pronargs=0
      and p.proname in ('requests_v2','directory_v2','my_contacts_v2')
  loop
    execute format('create function public.%I() returns %s language sql stable security invoker set search_path='''' as %L',
      'market_'||f.proname,f.result,format('select * from market_private.%I()',f.proname));
    execute format('revoke all on function public.%I(), market_private.%I() from public,anon,authenticated,service_role',
      'market_'||f.proname,f.proname);
    execute format('grant execute on function public.%I(), market_private.%I() to authenticated',
      'market_'||f.proname,f.proname);
  end loop;
end; $$;

create function market_billing.wallet_v2() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare base jsonb := market_billing.wallet();
begin
  return base || (
    select jsonb_build_object('paid_subscriber',market_billing.is_paid_subscriber(a.id),
      'phone_verified',market_private.profile_phone_verified(a.phone,u.phone,u.phone_confirmed_at))
    from public.professional_accounts a join auth.users u on u.id=a.user_id where a.user_id=auth.uid()
  );
end; $$;
create function public.market_wallet_v2() returns jsonb language sql stable security invoker set search_path='' as $$
  select market_billing.wallet_v2();
$$;
revoke all on function public.market_wallet_v2(),market_billing.wallet_v2() from public,anon,authenticated,service_role;
grant execute on function public.market_wallet_v2(),market_billing.wallet_v2() to authenticated;

notify pgrst,'reload schema';
commit;
