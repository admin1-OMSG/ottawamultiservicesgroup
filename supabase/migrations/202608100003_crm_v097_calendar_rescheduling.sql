-- v0.9.7 Calendar blocking + rescheduling
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

-- Recreate schedule block policy so older installations are repaired too.
drop policy if exists "Admins can manage schedule blocks" on public.schedule_blocks;
create policy "Admins can manage schedule blocks" on public.schedule_blocks for all to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true))
with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));

create or replace function public.admin_create_schedule_block(p_starts_at timestamptz,p_ends_at timestamptz,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if not exists(select 1 from admin_users where id=auth.uid() and is_active=true) then raise exception 'Admin access required'; end if;
 if p_ends_at<=p_starts_at then raise exception 'End must be after start'; end if;
 insert into schedule_blocks(starts_at,ends_at,reason,created_by) values(p_starts_at,p_ends_at,nullif(trim(p_reason),''),auth.uid()) returning id into v_id;
 insert into schedule_change_log(entity_type,entity_id,new_starts_at,new_ends_at,reason,changed_by) values('block',v_id,p_starts_at,p_ends_at,p_reason,auth.uid());
 return v_id;
end$$;
grant execute on function public.admin_create_schedule_block(timestamptz,timestamptz,text) to authenticated;

create or replace function public.admin_delete_schedule_block(p_block_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare b schedule_blocks%rowtype;
begin
 if not exists(select 1 from admin_users where id=auth.uid() and is_active=true) then raise exception 'Admin access required'; end if;
 select * into b from schedule_blocks where id=p_block_id; if not found then return; end if;
 insert into schedule_change_log(entity_type,entity_id,old_starts_at,old_ends_at,reason,changed_by) values('block',b.id,b.starts_at,b.ends_at,'Unblocked: '||coalesce(b.reason,''),auth.uid());
 delete from schedule_blocks where id=p_block_id;
end$$;
grant execute on function public.admin_delete_schedule_block(uuid) to authenticated;

create or replace function public.admin_reschedule_estimate_booking(p_estimate_id uuid,p_starts_at timestamptz,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare b estimate_bookings%rowtype; mins int; new_end timestamptz;
begin
 if not exists(select 1 from admin_users where id=auth.uid() and is_active=true) then raise exception 'Admin access required'; end if;
 select * into b from estimate_bookings where estimate_id=p_estimate_id and status='reserved'; if not found then raise exception 'Reserved booking not found'; end if;
 select estimated_duration_minutes into mins from estimates where id=p_estimate_id; if coalesce(mins,0)<=0 then raise exception 'Estimate duration missing'; end if;
 new_end:=p_starts_at+make_interval(mins=>mins);
 if exists(select 1 from schedule_blocks x where tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(p_starts_at,new_end,'[)')) then raise exception 'This time is blocked'; end if;
 if exists(select 1 from jobs j where j.status<>'cancelled' and j.scheduled_start is not null and j.scheduled_end is not null and tstzrange(j.scheduled_start,j.scheduled_end,'[)') && tstzrange(p_starts_at,new_end,'[)')) then raise exception 'This time is no longer available'; end if;
 if exists(select 1 from estimate_bookings x where x.status='reserved' and x.id<>b.id and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(p_starts_at,new_end,'[)')) then raise exception 'This time is no longer available'; end if;
 insert into schedule_change_log(entity_type,entity_id,old_starts_at,old_ends_at,new_starts_at,new_ends_at,reason,changed_by) values('booking',b.id,b.starts_at,b.ends_at,p_starts_at,new_end,p_reason,auth.uid());
 update estimate_bookings set starts_at=p_starts_at,ends_at=new_end,updated_at=now(),booked_by=auth.uid() where id=b.id; return b.id;
end$$;
grant execute on function public.admin_reschedule_estimate_booking(uuid,timestamptz,text) to authenticated;
