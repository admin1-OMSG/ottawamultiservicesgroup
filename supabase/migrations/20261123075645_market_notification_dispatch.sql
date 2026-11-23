-- A scheduled request carries a single-use, short-lived ticket instead of a service role key.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

create table market_private.dispatch_tickets (
  digest bytea primary key,
  expires_at timestamptz not null
);
create table market_private.sms_attempts (
  notification_id uuid primary key references market_private.notifications(id) on delete cascade,
  attempt uuid not null,
  state text not null check (state in ('reserved','accepted','failed')),
  provider_sid text
);
alter table market_private.dispatch_tickets enable row level security;
alter table market_private.sms_attempts enable row level security;
revoke all on market_private.dispatch_tickets, market_private.sms_attempts from public, anon, authenticated, service_role;

create function market_private.schedule_dispatch() returns void
language plpgsql security definer set search_path='' as $$
declare project_ref text; token text;
begin
  delete from market_private.dispatch_tickets where expires_at<=now();
  if not exists(select 1 from market_private.notifications where delivered_at is null and retry_at<=now()) then return; end if;
  -- An operator enables this project's job by setting its own project reference in Vault.
  select decrypted_secret into project_ref from vault.decrypted_secrets where name='market_dispatch_project_ref';
  if project_ref is null or project_ref !~ '^[a-z0-9]{20}$' then return; end if;
  token := replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  insert into market_private.dispatch_tickets values(sha256(convert_to(token,'UTF8')), now()+interval '90 seconds');
  perform net.http_post(
    url:='https://'||project_ref||'.supabase.co/functions/v1/market-dispatch',
    headers:=jsonb_build_object('Content-Type','application/json','X-Market-Ticket',token),
    body:='{}'::jsonb, timeout_milliseconds:=30000
  );
end; $$;

create function market_private.consume_dispatch_ticket(p_token text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return false; end if;
  delete from market_private.dispatch_tickets
    where digest=sha256(convert_to(p_token,'UTF8')) and expires_at>now();
  return found;
end; $$;

-- Twilio creates do not offer a client idempotency key. Reserve before sending.
-- A lost response is reconciled by Twilio's signed callback, never by blindly resending.
create function market_private.reserve_sms(p_id uuid,p_lease uuid,p_attempt uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from market_private.notifications where id=p_id and delivered_at is null and lease=p_lease for update;
  if not found then return false; end if;
  insert into market_private.sms_attempts(notification_id,attempt,state) values(p_id,p_attempt,'reserved')
    on conflict(notification_id) do nothing;
  return found;
end; $$;

create function market_private.sms_result(p_id uuid,p_attempt uuid,p_state text,p_sid text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare current_state text;
begin
  perform 1 from market_private.notifications where id=p_id for update;
  select state into current_state from market_private.sms_attempts where notification_id=p_id and attempt=p_attempt for update;
  if not found then return false; end if;
  if p_state='rejected' and current_state='reserved' then
    delete from market_private.sms_attempts where notification_id=p_id;
    update market_private.notifications set lease=null,retry_at=now()+make_interval(mins=>least(720,1 << least(attempts,10))) where id=p_id;
    return true;
  end if;
  if p_state not in ('accepted','failed') or p_state is null or p_sid is null or p_sid !~ '^SM[0-9a-fA-F]{32}$' then return false; end if;
  -- A terminal failure must not be overwritten by an out-of-order queued callback.
  if current_state='failed' then return p_state='failed'; end if;
  update market_private.sms_attempts set state=p_state,provider_sid=p_sid where notification_id=p_id;
  update market_private.notifications set delivered_at=case when p_state='accepted' then coalesce(delivered_at,now()) end,
    lease=null, retry_at='infinity'::timestamptz where id=p_id;
  return true;
end; $$;

create function public.market_consume_dispatch_ticket(p_token text) returns boolean
language sql security invoker set search_path='' as $$select market_private.consume_dispatch_ticket(p_token)$$;
create function public.market_reserve_sms(p_id uuid,p_lease uuid,p_attempt uuid) returns boolean
language sql security invoker set search_path='' as $$select market_private.reserve_sms(p_id,p_lease,p_attempt)$$;
create function public.market_sms_result(p_id uuid,p_attempt uuid,p_state text,p_sid text default null) returns boolean
language sql security invoker set search_path='' as $$select market_private.sms_result(p_id,p_attempt,p_state,p_sid)$$;

revoke all on function market_private.schedule_dispatch() from public,anon,authenticated,service_role;
revoke all on function market_private.consume_dispatch_ticket(text),market_private.reserve_sms(uuid,uuid,uuid),market_private.sms_result(uuid,uuid,text,text),
public.market_consume_dispatch_ticket(text),public.market_reserve_sms(uuid,uuid,uuid),public.market_sms_result(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function market_private.consume_dispatch_ticket(text),market_private.reserve_sms(uuid,uuid,uuid),market_private.sms_result(uuid,uuid,text,text),
public.market_consume_dispatch_ticket(text),public.market_reserve_sms(uuid,uuid,uuid),public.market_sms_result(uuid,uuid,text,text) to service_role;

select cron.schedule('omsg-market-notifications','* * * * *','select market_private.schedule_dispatch()');
