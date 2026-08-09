-- CRM v0.8 - quote workflow, estimated duration and customer scheduling
alter table public.estimates add column if not exists estimated_duration_hours numeric(6,2);
alter table public.estimates add column if not exists crew_size integer not null default 1;
alter table public.estimates add column if not exists sent_at timestamptz;
alter table public.estimates drop constraint if exists estimates_estimated_duration_hours_check;
alter table public.estimates add constraint estimates_estimated_duration_hours_check check (estimated_duration_hours is null or estimated_duration_hours > 0);
alter table public.estimates drop constraint if exists estimates_crew_size_check;
alter table public.estimates add constraint estimates_crew_size_check check (crew_size > 0 and crew_size <= 50);

create table if not exists public.business_hours (
  weekday integer primary key check (weekday between 0 and 6),
  is_open boolean not null default true,
  opens_at time not null default '08:00',
  closes_at time not null default '18:00',
  updated_at timestamptz not null default now()
);
insert into public.business_hours(weekday,is_open,opens_at,closes_at) values
(0,false,'09:00','17:00'),(1,true,'08:00','18:00'),(2,true,'08:00','18:00'),(3,true,'08:00','18:00'),
(4,true,'08:00','18:00'),(5,true,'08:00','18:00'),(6,true,'09:00','16:00') on conflict do nothing;

create table if not exists public.calendar_blocks (
  id uuid primary key default gen_random_uuid(), title text not null default 'Indisponible',
  starts_at timestamptz not null, ends_at timestamptz not null, created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create table if not exists public.estimate_bookings (
  id uuid primary key default gen_random_uuid(), estimate_id uuid not null unique references public.estimates(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null default 'reserved' check(status in ('reserved','converted','cancelled')),
  created_at timestamptz not null default now(), check(ends_at > starts_at)
);
create index if not exists estimate_bookings_time_idx on public.estimate_bookings(starts_at,ends_at);
create index if not exists calendar_blocks_time_idx on public.calendar_blocks(starts_at,ends_at);
alter table public.business_hours enable row level security;
alter table public.calendar_blocks enable row level security;
alter table public.estimate_bookings enable row level security;
drop policy if exists "Admins manage business hours" on public.business_hours;
create policy "Admins manage business hours" on public.business_hours for all to authenticated using (exists(select 1 from public.admin_users a where a.id=auth.uid() and a.is_active)) with check (exists(select 1 from public.admin_users a where a.id=auth.uid() and a.is_active));
drop policy if exists "Admins manage calendar blocks" on public.calendar_blocks;
create policy "Admins manage calendar blocks" on public.calendar_blocks for all to authenticated using (exists(select 1 from public.admin_users a where a.id=auth.uid() and a.is_active)) with check (exists(select 1 from public.admin_users a where a.id=auth.uid() and a.is_active));
drop policy if exists "Admins manage bookings" on public.estimate_bookings;
create policy "Admins manage bookings" on public.estimate_bookings for all to authenticated using (exists(select 1 from public.admin_users a where a.id=auth.uid() and a.is_active)) with check (exists(select 1 from public.admin_users a where a.id=auth.uid() and a.is_active));
drop policy if exists "Customers read own bookings" on public.estimate_bookings;
create policy "Customers read own bookings" on public.estimate_bookings for select to authenticated using (exists(select 1 from public.customer_accounts ca where ca.auth_user_id=auth.uid() and ca.customer_id=estimate_bookings.customer_id));

create or replace function public.get_available_slots(p_estimate_id uuid, p_day date)
returns table(slot_start timestamptz, slot_end timestamptz)
language plpgsql security definer set search_path=public as $$
declare cid uuid; dur interval; bh record; day_start timestamptz; day_end timestamptz; candidate timestamptz;
begin
 select ca.customer_id into cid from customer_accounts ca where ca.auth_user_id=auth.uid();
 if cid is null then raise exception 'Customer account not linked'; end if;
 select make_interval(secs => (e.estimated_duration_hours*3600)::int) into dur from estimates e where e.id=p_estimate_id and e.customer_id=cid and e.status='accepted';
 if dur is null then raise exception 'Estimate duration is missing'; end if;
 select * into bh from business_hours where weekday=extract(dow from p_day)::int and is_open=true;
 if not found then return; end if;
 day_start := (p_day + bh.opens_at) at time zone 'America/Toronto'; day_end := (p_day + bh.closes_at) at time zone 'America/Toronto';
 candidate := day_start;
 while candidate + dur <= day_end loop
   if candidate > now() and not exists(select 1 from calendar_blocks b where tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(candidate,candidate+dur,'[)'))
      and not exists(select 1 from jobs j where j.status <> 'cancelled' and j.scheduled_start is not null and j.scheduled_end is not null and tstzrange(j.scheduled_start,j.scheduled_end,'[)') && tstzrange(candidate,candidate+dur,'[)'))
      and not exists(select 1 from estimate_bookings eb where eb.status='reserved' and eb.estimate_id<>p_estimate_id and tstzrange(eb.starts_at,eb.ends_at,'[)') && tstzrange(candidate,candidate+dur,'[)')) then
      slot_start:=candidate; slot_end:=candidate+dur; return next;
   end if;
   candidate:=candidate+interval '30 minutes';
 end loop;
end $$;
grant execute on function public.get_available_slots(uuid,date) to authenticated;

create or replace function public.customer_book_estimate(p_estimate_id uuid,p_start timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid; d date; allowed record; bid uuid;
begin
 select customer_id into cid from customer_accounts where auth_user_id=auth.uid(); if cid is null then raise exception 'Customer account not linked'; end if;
 d := (p_start at time zone 'America/Toronto')::date;
 select * into allowed from get_available_slots(p_estimate_id,d) s where s.slot_start=p_start;
 if not found then raise exception 'This time is no longer available'; end if;
 insert into estimate_bookings(estimate_id,customer_id,starts_at,ends_at) values(p_estimate_id,cid,allowed.slot_start,allowed.slot_end)
 on conflict(estimate_id) do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,status='reserved' returning id into bid;
 return bid;
end $$;
grant execute on function public.customer_book_estimate(uuid,timestamptz) to authenticated;
