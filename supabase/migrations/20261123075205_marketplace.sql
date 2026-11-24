begin;

create schema market_private;
revoke all on schema market_private from public, anon, authenticated, service_role;
grant usage on schema market_private to authenticated, service_role;

create table market_private.requests (
  id uuid primary key,
  client_id uuid not null references auth.users on delete cascade,
  service text not null check (service ~ '^[a-z][a-z0-9_]{0,60}$'),
  city text not null check (length(city) between 1 and 100),
  title text not null check (length(title) between 1 and 160),
  description text not null check (length(description) between 1 and 4000),
  urgency text not null check (urgency in ('asap','week','flexible')),
  status text not null default 'open' check (status in ('open','completed')),
  credit_cost int check (credit_cost > 0),
  created_at timestamptz not null default now()
);
create index market_request_owner_idx on market_private.requests(client_id,created_at desc);
create index market_request_open_idx on market_private.requests(created_at desc) where status='open';

create table market_private.recipients (
  request_id uuid not null references market_private.requests on delete cascade,
  provider_id uuid not null references public.professional_accounts on delete cascade,
  matched boolean not null,
  invited boolean not null,
  primary key(request_id,provider_id),
  check (matched or invited)
);
create index market_recipients_pro_idx on market_private.recipients(provider_id,request_id);
create table market_private.contacts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references market_private.requests on delete cascade,
  provider_id uuid not null references public.professional_accounts on delete cascade,
  credit_cost int not null check (credit_cost > 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(request_id,provider_id)
);
create unique index market_one_completed_provider on market_private.contacts(request_id) where completed_at is not null;
create index market_contacts_pro_idx on market_private.contacts(provider_id,created_at desc);
create table market_private.messages (
  id uuid primary key,
  contact_id uuid not null references market_private.contacts on delete cascade,
  sender_id uuid not null references auth.users on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default clock_timestamp()
);
create index market_message_thread_idx on market_private.messages(contact_id,created_at,id);
create table market_private.reviews (
  contact_id uuid primary key references market_private.contacts on delete cascade,
  rating int not null check(rating between 1 and 5),
  body text not null check(length(body)<=2000),
  created_at timestamptz not null default now()
);
create table market_private.activity (
  user_id uuid primary key references auth.users on delete cascade,
  active_at timestamptz not null default now()
);

-- This row is both the private in-app notification and an outbound delivery job.
-- Storing recipient IDs rather than email/phone lets the worker send only to
-- currently verified destinations and avoids storing copies of contact details.
create table market_private.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users on delete cascade,
  recipient_is_provider boolean not null,
  kind text not null check(kind in ('match','invitation','contact','message')),
  request_id uuid not null references market_private.requests on delete cascade,
  provider_id uuid not null references public.professional_accounts on delete cascade,
  contact_id uuid references market_private.contacts on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  delivered_at timestamptz,
  attempts int not null default 0,
  retry_at timestamptz not null default now(),
  lease uuid
);
create index market_notifications_inbox_idx on market_private.notifications(recipient_id,created_at desc);
create index market_notifications_due_idx on market_private.notifications(retry_at) where delivered_at is null;

create function market_private.touch() returns void language sql volatile security definer set search_path=''
as $$
  insert into market_private.activity(user_id) select auth.uid() where auth.uid() is not null
  on conflict(user_id) do update set active_at=now() where market_private.activity.active_at < now()-interval '1 minute';
$$;

create function market_private.area_key(p_text text) returns text language sql immutable set search_path=''
as $$
  select btrim(regexp_replace(translate(lower(trim(p_text)), 'àâäçéèêëîïôöùûüÿ', 'aaaceeeeiioouuuy'), '[^a-z0-9]+',' ','g'));
$$;
create function market_private.region(p_city text) returns text language sql immutable set search_path=''
as $$
  select case
    when p_city in ('ottawa','orleans','kanata','barrhaven','nepean','stittsville','gloucester','vanier','riverside south','manotick','rockcliffe park','west carleton','cumberland') then 'ottawa'
    when p_city in ('gatineau','hull','aylmer','buckingham','masson angers') then 'gatineau'
    else p_city end;
$$;
create function market_private.serves_city(p_areas text[],p_city text) returns boolean language sql immutable set search_path=''
as $$
  select exists (
    select 1 from unnest(p_areas) declared(area),
      lateral (select market_private.area_key(area) as key) a,
      lateral (select market_private.area_key(p_city) as key) c
    where a.key=c.key or a.key=market_private.region(c.key)
      or (a.key in ('ottawa gatineau','gatineau ottawa','national capital region','region de la capitale nationale')
        and market_private.region(c.key) in ('ottawa','gatineau'))
  );
$$;
create function market_private.create_request(
  p_id uuid,p_service text,p_city text,p_title text,p_description text,p_urgency text,p_preferred_ids uuid[] default '{}'
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_preferred uuid[] := coalesce(p_preferred_ids,'{}');
begin
  if not exists(select 1 from auth.users u where u.id=v_actor and not coalesce(u.is_anonymous,false)
    and ((u.email_confirmed_at is not null and nullif(u.email,'') is not null)
      or (u.phone_confirmed_at is not null and nullif(u.phone,'') is not null))) then
    raise exception 'market_verified_contact_required' using errcode='42501';
  end if;
  if p_id is null or cardinality(v_preferred)>100 then raise exception 'market_invalid_request' using errcode='22023'; end if;
  -- All rows for an operation are committed together. A browser retry with the
  -- same UUID cannot duplicate invitations or reset a changed tariff.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,16002));
  select r.client_id into v_owner from market_private.requests r where r.id=p_id;
  if found then
    if v_owner=v_actor then return p_id; end if;
    raise exception 'market_request_unavailable' using errcode='42501';
  end if;
  if exists(select 1 from unnest(v_preferred) i where not exists (
    select 1 from public.professional_accounts a where a.id=i and a.review_status='approved' and a.user_id<>v_actor
  )) then raise exception 'market_preferred_unavailable' using errcode='22023'; end if;

  insert into market_private.requests(id,client_id,service,city,title,description,urgency,credit_cost)
    values(p_id,v_actor,p_service,trim(p_city),trim(p_title),trim(p_description),p_urgency,market_private.service_price(p_service));
  with eligible as (
    select a.id,(p_service=any(a.services) and market_private.serves_city(a.service_areas,p_city)) as matched,
      a.id=any(v_preferred) as invited
    from public.professional_accounts a where a.review_status='approved' and a.user_id<>v_actor
  )
  insert into market_private.recipients(request_id,provider_id,matched,invited)
    select p_id,id,matched,invited from eligible where matched or invited;
  insert into market_private.notifications(recipient_id,recipient_is_provider,kind,request_id,provider_id)
    select a.user_id,true,case when x.invited then 'invitation' else 'match' end,p_id,a.id
    from market_private.recipients x join public.professional_accounts a on a.id=x.provider_id where x.request_id=p_id;
  perform market_private.touch();
  return p_id;
end; $$;

create function market_private.invite(p_request_id uuid,p_provider_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_owner uuid; v_status text;
begin
  select client_id,status into v_owner,v_status from market_private.requests r where r.id=p_request_id for update;
  if not found or v_owner is distinct from auth.uid() then raise exception 'market_request_unavailable' using errcode='42501'; end if;
  if v_status <> 'open' then raise exception 'market_request_closed' using errcode='22023'; end if;
  select a.user_id into v_user from public.professional_accounts a where a.id=p_provider_id and a.user_id<>v_owner and a.review_status='approved';
  if not found then raise exception 'market_preferred_unavailable' using errcode='22023'; end if;
  if exists(select 1 from market_private.recipients x where x.request_id=p_request_id and x.provider_id=p_provider_id and x.invited) then return; end if;
  if (select count(*) from market_private.recipients x where x.request_id=p_request_id and x.invited)>=100 then
    raise exception 'market_preferred_limit' using errcode='22023';
  end if;
  insert into market_private.recipients(request_id,provider_id,matched,invited) values(p_request_id,p_provider_id,false,true)
    on conflict(request_id,provider_id) do update set invited=true;
  if not exists(select 1 from market_private.contacts c where c.request_id=p_request_id and c.provider_id=p_provider_id) then
    -- Upgrade a queued, unread generic notice rather than sending two emails.
    update market_private.notifications set kind='invitation' where request_id=p_request_id and provider_id=p_provider_id
      and kind='match' and attempts=0 and read_at is null;
    if not found then
      insert into market_private.notifications(recipient_id,recipient_is_provider,kind,request_id,provider_id)
        values(v_user,true,'invitation',p_request_id,p_provider_id);
    end if;
  end if;
  perform market_private.touch();
end; $$;

create function market_private.requests() returns table (
 id uuid,service text,city text,title text,description text,urgency text,status text,credit_cost int,
 created_at timestamptz,client_active_at timestamptz,email_verified boolean,phone_verified boolean,
 preferred_ids uuid[],preferred_names text[],is_owner boolean,matched boolean,invited boolean
) language sql stable security definer set search_path='' as $$
  select r.id,r.service,r.city,r.title,r.description,r.urgency,r.status,r.credit_cost,r.created_at,
    coalesce(act.active_at,r.created_at),u.email_confirmed_at is not null and nullif(u.email,'') is not null,
    u.phone_confirmed_at is not null and nullif(u.phone,'') is not null,
    case when r.client_id=auth.uid() then coalesce(pref.ids,'{}') else '{}' end,
    case when r.client_id=auth.uid() then coalesce(pref.names,'{}') else '{}' end,
    r.client_id=auth.uid(),coalesce(target.matched,false),coalesce(target.invited,false)
  from market_private.requests r join auth.users u on u.id=r.client_id
  left join market_private.activity act on act.user_id=r.client_id
  left join public.professional_accounts me on me.user_id=auth.uid() and me.review_status='approved'
  left join market_private.recipients target on target.provider_id=me.id and target.request_id=r.id
  left join lateral (
    select array_agg(a.id order by a.id) as ids,array_agg(coalesce(nullif(a.business_name,''),a.contact_name) order by a.id) as names
    from market_private.recipients x join public.professional_accounts a on a.id=x.provider_id
    where x.request_id=r.id and x.invited and r.client_id=auth.uid()
  ) pref on true
  where r.client_id=auth.uid() or (me.id is not null and
    (r.status='open' or exists(select 1 from market_private.contacts c where c.request_id=r.id and c.provider_id=me.id)))
  order by r.created_at desc,r.id;
$$;

create function market_private.directory() returns table (
  id uuid,name text,services text[],service_areas text[],city text,review_status text,active_at timestamptz,
  completed_count int,review_count int,average_rating numeric,google_maps_url text
) language sql stable security definer set search_path='' as $$
  select a.id,coalesce(nullif(a.business_name,''),a.contact_name),a.services,a.service_areas,a.city,a.review_status,
    coalesce(t.active_at,a.submitted_at),stats.jobs,stats.reviews,stats.rating,to_jsonb(a)->>'google_maps_url'
  from public.professional_accounts a left join market_private.activity t on t.user_id=a.user_id
  cross join lateral (select count(c.completed_at)::int as jobs,count(r.rating)::int as reviews,round(avg(r.rating),1) as rating
    from market_private.contacts c left join market_private.reviews r on r.contact_id=c.id where c.provider_id=a.id) stats
  where auth.uid() is not null and a.review_status='approved' and a.user_id<>auth.uid()
  order by coalesce(nullif(a.business_name,''),a.contact_name),a.id;
$$;

create function market_private.contact_created() returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into market_private.notifications(recipient_id,recipient_is_provider,kind,request_id,contact_id,provider_id)
    select r.client_id,false,'contact',r.id,new.id,new.provider_id from market_private.requests r where r.id=new.request_id;
  return new;
end;
$$;
create trigger market_contact_created after insert on market_private.contacts for each row execute function market_private.contact_created();

create function market_private.my_contacts() returns table (
  id uuid,request_id uuid,provider_id uuid,provider_name text,request_title text,credit_cost int,created_at timestamptz,
  completed_at timestamptz,review_rating int,review_body text,client_email text,client_phone text,my_provider boolean
) language sql stable security definer set search_path='' as $$
  select c.id,r.id,a.id,coalesce(nullif(a.business_name,''),a.contact_name),r.title,c.credit_cost,c.created_at,c.completed_at,
    v.rating,v.body,case when u.email_confirmed_at is not null then nullif(u.email,'') end,
    case when u.phone_confirmed_at is not null then nullif(u.phone,'') end,a.user_id=auth.uid()
  from market_private.contacts c join market_private.requests r on r.id=c.request_id
  join public.professional_accounts a on a.id=c.provider_id join auth.users u on u.id=r.client_id
  left join market_private.reviews v on v.contact_id=c.id
  where r.client_id=auth.uid() or (a.user_id=auth.uid() and a.review_status='approved')
  order by c.created_at desc,c.id;
$$;

create function market_private.messages(p_contact_id uuid) returns table (id uuid,body text,created_at timestamptz,mine boolean)
language sql stable security definer set search_path='' as $$
  select m.id,m.body,m.created_at,m.sender_id=auth.uid() from market_private.messages m
  join market_private.contacts c on c.id=m.contact_id join market_private.requests r on r.id=c.request_id
  join public.professional_accounts a on a.id=c.provider_id
  where c.id=p_contact_id and (r.client_id=auth.uid() or (a.user_id=auth.uid() and a.review_status='approved'))
  order by m.created_at,m.id;
$$;
create function market_private.send_message(p_contact_id uuid,p_id uuid,p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_rec record; v_id uuid;
begin
  select c.request_id,c.provider_id,r.client_id,a.user_id pro_user into v_rec
  from market_private.contacts c join market_private.requests r on r.id=c.request_id
  join public.professional_accounts a on a.id=c.provider_id where c.id=p_contact_id
  and a.review_status='approved' and auth.uid() in (r.client_id,a.user_id);
  if not found then raise exception 'market_conversation_unavailable' using errcode='42501'; end if;
  insert into market_private.messages(id,contact_id,sender_id,body) values(p_id,p_contact_id,auth.uid(),trim(p_body))
    on conflict(id) do nothing returning id into v_id;
  if v_id is null then
    if exists(select 1 from market_private.messages m where m.id=p_id and m.contact_id=p_contact_id and m.sender_id=auth.uid()) then return p_id; end if;
    raise exception 'market_message_unavailable' using errcode='42501';
  end if;
  insert into market_private.notifications(recipient_id,recipient_is_provider,kind,request_id,contact_id,provider_id)
    values(case when auth.uid()=v_rec.client_id then v_rec.pro_user else v_rec.client_id end,
      auth.uid()=v_rec.client_id,'message',v_rec.request_id,p_contact_id,v_rec.provider_id);
  perform market_private.touch();
  return p_id;
end; $$;

create function market_private.complete(p_contact_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_request uuid; v_completed timestamptz;
begin
  select r.id,c.completed_at into v_request,v_completed from market_private.contacts c join market_private.requests r on r.id=c.request_id
    where c.id=p_contact_id and r.client_id=auth.uid() for update of r;
  if not found then raise exception 'market_conversation_unavailable' using errcode='42501'; end if;
  if v_completed is not null then return; end if;
  if exists(select 1 from market_private.contacts c where c.request_id=v_request and c.completed_at is not null and c.id<>p_contact_id) then
    raise exception 'market_already_completed' using errcode='22023';
  end if;
  update market_private.contacts set completed_at=coalesce(completed_at,now()) where id=p_contact_id;
  update market_private.requests set status='completed' where id=v_request;
  perform market_private.touch();
end; $$;
create function market_private.review(p_contact_id uuid,p_rating int,p_body text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from market_private.contacts c join market_private.requests r on r.id=c.request_id
    where c.id=p_contact_id and c.completed_at is not null and r.client_id=auth.uid()) then
    raise exception 'market_completed_work_required' using errcode='42501';
  end if;
  insert into market_private.reviews(contact_id,rating,body) values(p_contact_id,p_rating,trim(coalesce(p_body,'')))
    on conflict(contact_id) do update set rating=excluded.rating,body=excluded.body;
  perform market_private.touch();
end; $$;
create function market_private.reviews(p_provider_id uuid) returns table(rating int,body text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select v.rating,v.body,v.created_at from market_private.reviews v join market_private.contacts c on c.id=v.contact_id
  join public.professional_accounts a on a.id=c.provider_id where c.provider_id=p_provider_id and a.review_status='approved' and auth.uid() is not null
  order by v.created_at desc,v.contact_id;
$$;

create function market_private.notifications() returns table (
  id uuid,kind text,request_id uuid,contact_id uuid,provider_name text,created_at timestamptz,read_at timestamptz
) language sql stable security definer set search_path='' as $$
  select n.id,n.kind,n.request_id,n.contact_id,coalesce(nullif(a.business_name,''),a.contact_name),n.created_at,n.read_at
  from market_private.notifications n join public.professional_accounts a on a.id=n.provider_id
  where n.recipient_id=auth.uid() and (not n.recipient_is_provider or a.review_status='approved')
  order by n.created_at desc,n.id;
$$;
create function market_private.read_notification(p_id uuid) returns void language sql security definer set search_path='' as $$
  update market_private.notifications set read_at=coalesce(read_at,now()) where id=p_id and recipient_id=auth.uid();
$$;

create function market_private.claim_deliveries(p_limit integer default 20,p_email boolean default true,p_sms boolean default true) returns table (
  id uuid,lease uuid,kind text,email text,phone text,locale text,request_id uuid,contact_id uuid,
  provider_name text,service text,recipient_is_provider boolean
) language sql volatile security definer set search_path='' as $$
  with due as (
    select n.id from market_private.notifications n join auth.users u on u.id=n.recipient_id
    join public.professional_accounts a on a.id=n.provider_id
    where n.delivered_at is null and n.retry_at<=now() and (not n.recipient_is_provider or a.review_status='approved')
      and ((p_email and u.email_confirmed_at is not null and nullif(u.email,'') is not null)
        or (p_sms and u.phone_confirmed_at is not null and nullif(u.phone,'') is not null))
      order by n.retry_at,n.id limit greatest(1,least(coalesce(p_limit,20),100)) for update of n skip locked
  ), changed as (
    update market_private.notifications n set attempts=attempts+1,lease=gen_random_uuid(),retry_at=now()+interval '5 minutes'
    from due where n.id=due.id returning n.*
  )
  select n.id,n.lease,n.kind,case when u.email_confirmed_at is not null then nullif(u.email,'') end,
    case when u.phone_confirmed_at is not null then nullif(u.phone,'') end,
    case when n.recipient_is_provider then a.preferred_language when lower(u.raw_user_meta_data->>'language')='fr' then 'fr' else 'en' end,
    n.request_id,n.contact_id,coalesce(nullif(a.business_name,''),a.contact_name),r.service,n.recipient_is_provider
    from changed n join public.professional_accounts a on a.id=n.provider_id join auth.users u on u.id=n.recipient_id
    join market_private.requests r on r.id=n.request_id;
$$;
create function market_private.finish_delivery(p_id uuid,p_lease uuid,p_ok boolean) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  update market_private.notifications n set delivered_at=case when p_ok then now() end,
    retry_at=now()+make_interval(mins => least(720, (1 << least(attempts,10)))),lease=null
    where n.id=p_id and n.lease=p_lease and n.delivered_at is null;
  return found;
end; $$;

-- The browser only receives the projections above. Explicit table ACLs and
-- RLS protect newly created relations even under permissive default grants.
do $$
declare rel text;
begin
  foreach rel in array array['requests','recipients','contacts','messages','reviews','activity','notifications'] loop
    execute format('alter table market_private.%I enable row level security',rel);
    execute format('revoke all on market_private.%I from public, anon, authenticated, service_role',rel);
  end loop;
end; $$;
revoke all on all functions in schema market_private from public, anon, authenticated, service_role;

-- Only allowlisted operations have a PostgREST entry point. Wrappers are
-- invoker-only; implementation functions use a fixed empty search_path.
do $$
declare f record; wrapper text; targetrole text;
begin
  for f in select p.oid,p.proname,p.pronargs,p.proargnames,p.proretset,p.provolatile,
    pg_get_function_arguments(p.oid) as args,pg_get_function_identity_arguments(p.oid) as ident,
    pg_get_function_result(p.oid) as result from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='market_private' and p.proname=any(array['touch','create_request','invite','requests','directory','my_contacts',
      'messages','send_message','complete','review','reviews','notifications','read_notification','claim_deliveries','finish_delivery'])
  loop
    wrapper := 'market_'||f.proname;
    targetrole := case when f.proname in ('claim_deliveries','finish_delivery') then 'service_role' else 'authenticated' end;
    execute format('create function public.%I(%s) returns %s language sql %s security invoker set search_path='''' as %L',
      wrapper,f.args,f.result,case when f.provolatile='s' then 'stable' else 'volatile' end,
      format('select %smarket_private.%I(%s)',case when f.proretset then '* from ' else '' end,
        f.proname,array_to_string(f.proargnames[1:f.pronargs],',')));
    execute format('revoke all on function public.%I(%s) from public, anon, authenticated, service_role',wrapper,f.ident);
    execute format('grant execute on function public.%I(%s), market_private.%I(%s) to %I',wrapper,f.ident,f.proname,f.ident,targetrole);
  end loop;
end;
$$;

commit;
