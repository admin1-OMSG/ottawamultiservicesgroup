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

-- Recreate the affected projections to append fields to their return types.
-- Keep existing visibility rules, sort order and locked contact details intact.
drop function public.market_requests(), public.market_directory(), public.market_my_contacts();
drop function market_private.requests(), market_private.directory(), market_private.my_contacts();

create function market_private.requests() returns table (
  id uuid,service text,city text,title text,description text,urgency text,status text,credit_cost int,
  created_at timestamptz,client_active_at timestamptz,email_verified boolean,phone_verified boolean,
  preferred_ids uuid[],preferred_names text[],is_owner boolean,matched boolean,invited boolean,
  repeat_client boolean,details_updated_at timestamptz
) language sql stable security definer set search_path='' as $$
  select r.id,r.service,r.city,r.title,concat_ws(E'\n\n',r.description,details.body),r.urgency,r.status,r.credit_cost,r.created_at,
    coalesce(act.active_at,r.created_at),u.email_confirmed_at is not null and nullif(u.email,'') is not null,
    u.phone_confirmed_at is not null and coalesce(u.phone ~ '[0-9]',false),
    case when r.client_id=auth.uid() then coalesce(pref.ids,'{}') else '{}' end,
    case when r.client_id=auth.uid() then coalesce(pref.names,'{}') else '{}' end,
    r.client_id=auth.uid(),coalesce(target.matched,false),coalesce(target.invited,false),
    exists(select 1 from market_private.requests history where history.client_id=r.client_id offset 3),
    details.last_added
  from market_private.requests r join auth.users u on u.id=r.client_id
  left join market_private.activity act on act.user_id=r.client_id
  left join public.professional_accounts me on me.user_id=auth.uid() and me.review_status='approved'
  left join market_private.recipients target on target.provider_id=me.id and target.request_id=r.id
  left join lateral (
    select array_agg(a.id order by a.id) as ids,array_agg(coalesce(nullif(a.business_name,''),a.contact_name) order by a.id) as names
    from market_private.recipients x join public.professional_accounts a on a.id=x.provider_id
    where x.request_id=r.id and x.invited and r.client_id=auth.uid()
  ) pref on true
  left join lateral (
    select string_agg(d.body,E'\n\n' order by d.created_at,d.id) as body,max(d.created_at) as last_added
    from market_private.request_details d where d.request_id=r.id
  ) details on true
  where r.client_id=auth.uid() or (me.id is not null and
    (r.status='open' or exists(select 1 from market_private.contacts c where c.request_id=r.id and c.provider_id=me.id)))
  order by r.created_at desc,r.id;
$$;

create function market_private.directory() returns table (
  id uuid,name text,services text[],service_areas text[],city text,review_status text,active_at timestamptz,
  completed_count int,review_count int,average_rating numeric,google_maps_url text,paid_subscriber boolean,phone_verified boolean
) language sql stable security definer set search_path='' as $$
  select a.id,coalesce(nullif(a.business_name,''),a.contact_name),a.services,a.service_areas,a.city,a.review_status,
    coalesce(t.active_at,a.submitted_at),stats.jobs,stats.reviews,stats.rating,to_jsonb(a)->>'google_maps_url',
    market_billing.is_paid_subscriber(a.id),market_private.profile_phone_verified(a.phone,u.phone,u.phone_confirmed_at)
  from public.professional_accounts a join auth.users u on u.id=a.user_id
  left join market_private.activity t on t.user_id=a.user_id
  cross join lateral (select count(c.completed_at)::int as jobs,count(r.rating)::int as reviews,round(avg(r.rating),1) as rating
    from market_private.contacts c left join market_private.reviews r on r.contact_id=c.id where c.provider_id=a.id) stats
  where auth.uid() is not null and a.review_status='approved' and a.user_id<>auth.uid()
  order by coalesce(nullif(a.business_name,''),a.contact_name),a.id;
$$;

create function market_private.my_contacts() returns table (
  id uuid,request_id uuid,provider_id uuid,provider_name text,request_title text,credit_cost int,created_at timestamptz,
  completed_at timestamptz,review_rating int,review_body text,client_email text,client_phone text,my_provider boolean,
  provider_paid_subscriber boolean,provider_phone_verified boolean
) language sql stable security definer set search_path='' as $$
  select c.id,r.id,a.id,coalesce(nullif(a.business_name,''),a.contact_name),r.title,c.credit_cost,c.created_at,c.completed_at,
    v.rating,v.body,case when u.email_confirmed_at is not null then nullif(u.email,'') end,
    case when u.phone_confirmed_at is not null and u.phone ~ '[0-9]' then u.phone end,a.user_id=auth.uid(),
    market_billing.is_paid_subscriber(a.id),market_private.profile_phone_verified(a.phone,p.phone,p.phone_confirmed_at)
  from market_private.contacts c join market_private.requests r on r.id=c.request_id
  join public.professional_accounts a on a.id=c.provider_id join auth.users u on u.id=r.client_id
  join auth.users p on p.id=a.user_id left join market_private.reviews v on v.contact_id=c.id
  where r.client_id=auth.uid() or (a.user_id=auth.uid() and a.review_status='approved')
  order by c.created_at desc,c.id;
$$;

do $$
declare f record;
begin
  for f in select p.proname,pg_get_function_result(p.oid) as result
    from pg_proc p where p.pronamespace='market_private'::regnamespace and p.pronargs=0
      and p.proname in ('requests','directory','my_contacts')
  loop
    execute format('create function public.%I() returns %s language sql stable security invoker set search_path='''' as %L',
      'market_'||f.proname,f.result,format('select * from market_private.%I()',f.proname));
    execute format('revoke all on function public.%I(), market_private.%I() from public,anon,authenticated,service_role',
      'market_'||f.proname,f.proname);
    execute format('grant execute on function public.%I(), market_private.%I() to authenticated',
      'market_'||f.proname,f.proname);
  end loop;
end; $$;

create or replace function market_billing.wallet() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare pid uuid := market_billing.provider(false); wallet market_billing.wallets;
begin
  select * into wallet from market_billing.wallets where provider_id=pid;
  return jsonb_build_object('balance',coalesce(wallet.balance,0),'discount_percent',coalesce(wallet.discount_percent,0),
    'paid_subscriber',market_billing.is_paid_subscriber(pid),
    'phone_verified',(select market_private.profile_phone_verified(a.phone,u.phone,u.phone_confirmed_at)
      from public.professional_accounts a join auth.users u on u.id=a.user_id where a.id=pid),
    'preview_checkout_enabled',(select preview_checkout_enabled from market_billing.settings),
    'packs',(select jsonb_agg(to_jsonb(o)||jsonb_build_object('list_price_cents',o.price_cents,
          'price_cents',market_billing.price(o.price_cents,coalesce(wallet.discount_percent,0))) order by o.price_cents nulls last) from market_billing.offers o),
    'subscription',(select jsonb_build_object('status',sub_status,'offer_code',offer_code) from market_billing.orders
      where provider_id=pid and sub_status is not null and sub_status not in ('canceled','incomplete_expired') order by created_at desc limit 1),
    'refunds',coalesce((select jsonb_agg(jsonb_build_object('contact_id',f.contact_id,'status',f.status,'reason',f.reason,'note',f.note))
      from market_billing.refunds f join market_private.contacts c on c.id=f.contact_id where c.provider_id=pid),'[]'::jsonb));
end; $$;

notify pgrst,'reload schema';
commit;
