-- Ottawa Multiservices Group CRM v0.8 workflow + scheduling
-- Adds estimate duration/crew data, customer booking slots and scheduling rules.

alter table public.estimates
  add column if not exists estimated_duration_minutes integer,
  add column if not exists crew_size integer not null default 1,
  add column if not exists sent_at timestamptz;

alter table public.estimates
  drop constraint if exists estimates_estimated_duration_minutes_check,
  add constraint estimates_estimated_duration_minutes_check
    check (estimated_duration_minutes is null or estimated_duration_minutes between 30 and 1440),
  drop constraint if exists estimates_crew_size_check,
  add constraint estimates_crew_size_check
    check (crew_size between 1 and 20);


alter table public.email_notifications
  drop constraint if exists email_notifications_event_type_check;

alter table public.email_notifications
  add constraint email_notifications_event_type_check
  check (event_type in ('quote_requested','estimate_accepted','estimate_ready','appointment_proposed','booking_confirmed'));

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null unique check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  opens_at time not null default '08:00',
  closes_at time not null default '18:00',
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes in (15,30,60)),
  updated_at timestamptz not null default now()
);

insert into public.business_hours(day_of_week,is_open,opens_at,closes_at,slot_interval_minutes)
values
  (0,false,'09:00','16:00',30),
  (1,true,'08:00','18:00',30),
  (2,true,'08:00','18:00',30),
  (3,true,'08:00','18:00',30),
  (4,true,'08:00','18:00',30),
  (5,true,'08:00','18:00',30),
  (6,true,'09:00','16:00',30)
on conflict (day_of_week) do nothing;

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.estimate_bookings (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null unique references public.estimates(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'reserved' check (status in ('reserved','converted','cancelled')),
  booked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists estimate_bookings_starts_idx on public.estimate_bookings(starts_at);
create index if not exists schedule_blocks_starts_idx on public.schedule_blocks(starts_at);

alter table public.business_hours enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.estimate_bookings enable row level security;

drop policy if exists "Admins can manage business hours" on public.business_hours;
create policy "Admins can manage business hours" on public.business_hours
for all to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true))
with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));

drop policy if exists "Admins can manage schedule blocks" on public.schedule_blocks;
create policy "Admins can manage schedule blocks" on public.schedule_blocks
for all to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true))
with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));

drop policy if exists "Admins can manage estimate bookings" on public.estimate_bookings;
create policy "Admins can manage estimate bookings" on public.estimate_bookings
for all to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true))
with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));

drop policy if exists "Customers can read own estimate bookings" on public.estimate_bookings;
create policy "Customers can read own estimate bookings" on public.estimate_bookings
for select to authenticated
using (exists(select 1 from public.customer_accounts ca where ca.auth_user_id=auth.uid() and ca.customer_id=estimate_bookings.customer_id));

create or replace function public.customer_book_estimate_slot(
  p_estimate_id uuid,
  p_starts_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  linked_customer uuid;
  duration_minutes integer;
  p_ends_at timestamptz;
  booking_id uuid;
begin
  select customer_id into linked_customer
  from public.customer_accounts
  where auth_user_id=auth.uid();

  if linked_customer is null then raise exception 'Customer account not linked'; end if;

  select estimated_duration_minutes into duration_minutes
  from public.estimates
  where id=p_estimate_id
    and customer_id=linked_customer
    and status='accepted';

  if duration_minutes is null then raise exception 'Estimate duration missing'; end if;
  p_ends_at := p_starts_at + make_interval(mins => duration_minutes);

  if exists (
    select 1 from public.jobs j
    where j.status <> 'cancelled'
      and j.scheduled_start is not null and j.scheduled_end is not null
      and tstzrange(j.scheduled_start,j.scheduled_end,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then raise exception 'This time is no longer available'; end if;

  if exists (
    select 1 from public.schedule_blocks b
    where tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then raise exception 'This time is blocked'; end if;

  if exists (
    select 1 from public.estimate_bookings b
    where b.status='reserved'
      and b.estimate_id <> p_estimate_id
      and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then raise exception 'This time is no longer available'; end if;

  insert into public.estimate_bookings(estimate_id,customer_id,starts_at,ends_at,status,booked_by)
  values(p_estimate_id,linked_customer,p_starts_at,p_ends_at,'reserved',auth.uid())
  on conflict (estimate_id) do update
    set starts_at=excluded.starts_at,
        ends_at=excluded.ends_at,
        status='reserved',
        booked_by=auth.uid(),
        updated_at=now()
  returning id into booking_id;

  return booking_id;
end;
$$;

grant execute on function public.customer_book_estimate_slot(uuid,timestamptz) to authenticated;

-- v0.8.1: customer chooses the appointment BEFORE signing.
-- Acceptance, electronic signature and reservation are committed atomically.
create or replace function public.customer_accept_estimate_with_booking(
  p_estimate_id uuid,
  p_starts_at timestamptz,
  p_signer_name text,
  p_signature_data_url text,
  p_consent_text text,
  p_ip_address text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  linked_customer uuid;
  estimate_row public.estimates%rowtype;
  duration_minutes integer;
  p_ends_at timestamptz;
  booking_id uuid;
  signature_id uuid;
  signed_time timestamptz := now();
  local_start timestamp;
  local_end timestamp;
  hours_row public.business_hours%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select customer_id into linked_customer
  from public.customer_accounts
  where auth_user_id=auth.uid();

  if linked_customer is null then
    raise exception 'Customer account not linked';
  end if;

  select * into estimate_row
  from public.estimates
  where id=p_estimate_id
    and customer_id=linked_customer
  for update;

  if not found then
    raise exception 'Estimate not found';
  end if;

  if estimate_row.status not in ('sent','viewed','pending_review') then
    raise exception 'Estimate is not available for acceptance';
  end if;

  if exists (select 1 from public.estimate_signatures s where s.estimate_id=p_estimate_id) then
    raise exception 'This estimate has already been signed';
  end if;

  duration_minutes := estimate_row.estimated_duration_minutes;
  if duration_minutes is null then
    raise exception 'Estimate duration missing';
  end if;

  p_ends_at := p_starts_at + make_interval(mins => duration_minutes);
  local_start := p_starts_at at time zone 'America/Toronto';
  local_end := p_ends_at at time zone 'America/Toronto';

  select * into hours_row
  from public.business_hours
  where day_of_week = extract(dow from local_start)::integer;

  if not found or not hours_row.is_open then
    raise exception 'This time is outside business hours';
  end if;

  if local_start::date <> local_end::date
     or local_start::time < hours_row.opens_at
     or local_end::time > hours_row.closes_at then
    raise exception 'This time is outside business hours';
  end if;

  if p_starts_at < now() + interval '30 minutes' then
    raise exception 'This time is no longer available';
  end if;

  if exists (
    select 1 from public.jobs j
    where j.status <> 'cancelled'
      and j.scheduled_start is not null and j.scheduled_end is not null
      and tstzrange(j.scheduled_start,j.scheduled_end,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then
    raise exception 'This time is no longer available';
  end if;

  if exists (
    select 1 from public.schedule_blocks b
    where tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then
    raise exception 'This time is blocked';
  end if;

  if exists (
    select 1 from public.estimate_bookings b
    where b.status='reserved'
      and b.estimate_id <> p_estimate_id
      and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then
    raise exception 'This time is no longer available';
  end if;

  insert into public.estimate_bookings(estimate_id,customer_id,starts_at,ends_at,status,booked_by)
  values(p_estimate_id,linked_customer,p_starts_at,p_ends_at,'reserved',auth.uid())
  on conflict (estimate_id) do update
    set starts_at=excluded.starts_at,
        ends_at=excluded.ends_at,
        status='reserved',
        booked_by=auth.uid(),
        updated_at=now()
  returning id into booking_id;

  insert into public.estimate_signatures(
    estimate_id,customer_id,signer_user_id,signer_name,signature_data_url,
    consent_text,ip_address,user_agent,signed_at
  ) values (
    p_estimate_id,linked_customer,auth.uid(),trim(p_signer_name),p_signature_data_url,
    p_consent_text,nullif(p_ip_address,'')::inet,left(p_user_agent,500),signed_time
  )
  returning id into signature_id;

  update public.estimates
  set status='accepted', updated_at=signed_time
  where id=p_estimate_id;

  return jsonb_build_object(
    'signatureId',signature_id,
    'bookingId',booking_id,
    'signedAt',signed_time,
    'startsAt',p_starts_at,
    'endsAt',p_ends_at
  );
end;
$$;

revoke all on function public.customer_accept_estimate_with_booking(uuid,timestamptz,text,text,text,text,text) from public, anon;
grant execute on function public.customer_accept_estimate_with_booking(uuid,timestamptz,text,text,text,text,text) to authenticated;
