-- v0.9.8 Reschedule accepted/converted appointments and keep linked jobs synchronized
create table if not exists public.schedule_change_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('booking','job','block')),
  entity_id uuid not null,
  old_starts_at timestamptz,
  old_ends_at timestamptz,
  new_starts_at timestamptz,
  new_ends_at timestamptz,
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
alter table public.schedule_change_log enable row level security;
drop policy if exists "Admins read schedule change log" on public.schedule_change_log;
create policy "Admins read schedule change log" on public.schedule_change_log for select to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));

create or replace function public.customer_reschedule_estimate_booking(p_estimate_id uuid,p_starts_at timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid; e public.estimates%rowtype; b public.estimate_bookings%rowtype; mins int; new_end timestamptz; linked_job public.jobs%rowtype;
begin
 select customer_id into cid from customer_accounts where auth_user_id=auth.uid();
 if cid is null then raise exception 'Customer account not linked'; end if;
 select * into e from estimates where id=p_estimate_id and customer_id=cid;
 if not found or e.status not in ('accepted','converted_to_job') then raise exception 'This appointment cannot be changed'; end if;
 select * into b from estimate_bookings where estimate_id=p_estimate_id and customer_id=cid and status in ('reserved','converted');
 if not found then raise exception 'Appointment not found'; end if;
 mins:=e.estimated_duration_minutes; if coalesce(mins,0)<=0 then raise exception 'Estimate duration missing'; end if;
 new_end:=p_starts_at+make_interval(mins=>mins);
 if p_starts_at < now()+interval '30 minutes' then raise exception 'This time is no longer available'; end if;
 if exists(select 1 from schedule_blocks x where tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(p_starts_at,new_end,'[)')) then raise exception 'This time is blocked'; end if;
 if exists(select 1 from jobs j where j.status not in ('cancelled','completed') and j.estimate_id is distinct from p_estimate_id and j.scheduled_start is not null and j.scheduled_end is not null and tstzrange(j.scheduled_start,j.scheduled_end,'[)') && tstzrange(p_starts_at,new_end,'[)')) then raise exception 'This time is no longer available'; end if;
 if exists(select 1 from estimate_bookings x where x.status in ('reserved','converted') and x.id<>b.id and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(p_starts_at,new_end,'[)')) then raise exception 'This time is no longer available'; end if;
 insert into schedule_change_log(entity_type,entity_id,old_starts_at,old_ends_at,new_starts_at,new_ends_at,reason,changed_by) values('booking',b.id,b.starts_at,b.ends_at,p_starts_at,new_end,'Changed by customer',auth.uid());
 update estimate_bookings set starts_at=p_starts_at,ends_at=new_end,updated_at=now(),booked_by=auth.uid() where id=b.id;
 update jobs set scheduled_start=p_starts_at,scheduled_end=new_end,updated_at=now() where estimate_id=p_estimate_id and status not in ('cancelled','completed');
 return b.id;
end$$;
grant execute on function public.customer_reschedule_estimate_booking(uuid,timestamptz) to authenticated;

create or replace function public.admin_reschedule_estimate_booking(p_estimate_id uuid,p_starts_at timestamptz,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare e public.estimates%rowtype; b public.estimate_bookings%rowtype; mins int; new_end timestamptz;
begin
 if not exists(select 1 from admin_users where id=auth.uid() and is_active=true) then raise exception 'Admin access required'; end if;
 select * into e from estimates where id=p_estimate_id; if not found then raise exception 'Estimate not found'; end if;
 select * into b from estimate_bookings where estimate_id=p_estimate_id and status in ('reserved','converted'); if not found then raise exception 'Appointment not found'; end if;
 mins:=e.estimated_duration_minutes; if coalesce(mins,0)<=0 then raise exception 'Estimate duration missing'; end if;
 new_end:=p_starts_at+make_interval(mins=>mins);
 if exists(select 1 from schedule_blocks x where tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(p_starts_at,new_end,'[)')) then raise exception 'This time is blocked'; end if;
 if exists(select 1 from jobs j where j.status not in ('cancelled','completed') and j.estimate_id is distinct from p_estimate_id and j.scheduled_start is not null and j.scheduled_end is not null and tstzrange(j.scheduled_start,j.scheduled_end,'[)') && tstzrange(p_starts_at,new_end,'[)')) then raise exception 'This time is no longer available'; end if;
 if exists(select 1 from estimate_bookings x where x.status in ('reserved','converted') and x.id<>b.id and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(p_starts_at,new_end,'[)')) then raise exception 'This time is no longer available'; end if;
 insert into schedule_change_log(entity_type,entity_id,old_starts_at,old_ends_at,new_starts_at,new_ends_at,reason,changed_by) values('booking',b.id,b.starts_at,b.ends_at,p_starts_at,new_end,p_reason,auth.uid());
 update estimate_bookings set starts_at=p_starts_at,ends_at=new_end,updated_at=now(),booked_by=auth.uid() where id=b.id;
 update jobs set scheduled_start=p_starts_at,scheduled_end=new_end,updated_at=now() where estimate_id=p_estimate_id and status not in ('cancelled','completed');
 return b.id;
end$$;
grant execute on function public.admin_reschedule_estimate_booking(uuid,timestamptz,text) to authenticated;
