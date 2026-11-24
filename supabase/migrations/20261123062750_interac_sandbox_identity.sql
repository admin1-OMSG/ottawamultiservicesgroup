-- A sandbox verification never changes the professional review decision.
begin;

create schema interac_private;
revoke all on schema interac_private from public, anon, authenticated, service_role;
grant usage on schema interac_private to authenticated, service_role;

create table interac_private.sandbox_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.professional_accounts(user_id) on delete cascade,
  state_hash text not null unique check (state_hash ~ '^[0-9a-f]{64}$'),
  browser_hash text check (browser_hash ~ '^[0-9a-f]{64}$'),
  nonce text check (nonce ~ '^[A-Za-z0-9_-]{16,128}$'),
  verifier text check (verifier ~ '^[A-Za-z0-9._~-]{43,128}$'),
  phase text not null default 'pending'
    check (phase in ('pending', 'claimed', 'verified', 'failed', 'expired')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '15 minutes'),
  check (
    (phase = 'pending' and browser_hash is not null and nonce is not null and verifier is not null)
    or (phase <> 'pending' and browser_hash is null and nonce is null and verifier is null)
  )
);
create index interac_sandbox_attempt_user_time_idx
  on interac_private.sandbox_attempts(user_id, created_at desc);
create unique index interac_sandbox_current_user_idx
  on interac_private.sandbox_attempts(user_id) where phase in ('pending','claimed','verified');
alter table interac_private.sandbox_attempts enable row level security;
revoke all on interac_private.sandbox_attempts from public, anon, authenticated, service_role;

create function interac_private.start_attempt(
  p_user_id uuid, p_state_hash text, p_browser_hash text, p_nonce text, p_verifier text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_attempt_id uuid;
  v_limit_from timestamptz;
begin
  -- The caller authenticates the browser with Supabase Auth before supplying its UUID.
  if not exists (
    select 1 from public.professional_accounts a join auth.users u on u.id = a.user_id
    where a.user_id = p_user_id and a.review_status <> 'suspended'
      and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
  ) then raise exception 'interac_sandbox_profile_required' using errcode = '42501'; end if;

  -- Starts and final decisions serialize for this professional. Retries supersede
  -- earlier callbacks, even when an earlier token exchange is still in flight.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 9142073));
  if exists (select 1 from interac_private.sandbox_attempts where user_id = p_user_id and phase = 'verified') then
    raise exception 'interac_sandbox_already_verified';
  end if;
  v_limit_from := clock_timestamp() - interval '1 hour';
  if (select count(*) from interac_private.sandbox_attempts where user_id = p_user_id and created_at >= v_limit_from) >= 5 then
    raise exception 'interac_sandbox_rate_limited';
  end if;
  delete from interac_private.sandbox_attempts where user_id = p_user_id and created_at < v_limit_from;
  update interac_private.sandbox_attempts
    set phase = 'failed', updated_at = clock_timestamp(), browser_hash = null, nonce = null, verifier = null
    where user_id = p_user_id and phase in ('pending', 'claimed');
  insert into interac_private.sandbox_attempts (user_id,state_hash,browser_hash,nonce,verifier)
    values (p_user_id,p_state_hash,p_browser_hash,p_nonce,p_verifier) returning id into v_attempt_id;
  return v_attempt_id;
end;
$$;

create function interac_private.claim_attempt(p_state_hash text, p_browser_hash text)
returns table(attempt_id uuid, user_id uuid, nonce text, verifier text)
language plpgsql security definer set search_path = '' as $$
declare
  v_attempt interac_private.sandbox_attempts%rowtype;
begin
  select a.* into v_attempt from interac_private.sandbox_attempts a
    where a.state_hash = p_state_hash and a.browser_hash = p_browser_hash and a.phase = 'pending'
    for update;
  if not found then return; end if;
  if v_attempt.expires_at <= clock_timestamp() then
    update interac_private.sandbox_attempts a
      set phase = 'expired', updated_at = clock_timestamp(), browser_hash = null, nonce = null, verifier = null
      where a.id = v_attempt.id;
    return;
  end if;
  update interac_private.sandbox_attempts a
    set phase = 'claimed', updated_at = clock_timestamp(), browser_hash = null, nonce = null, verifier = null
    where a.id = v_attempt.id;
  return query select v_attempt.id, v_attempt.user_id, v_attempt.nonce, v_attempt.verifier;
end;
$$;

create function interac_private.finish_attempt(p_attempt_id uuid, p_outcome text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
begin
  if p_outcome is null or p_outcome not in ('verified','failed') then
    raise exception 'interac_sandbox_invalid_outcome' using errcode = '22023';
  end if;
  select user_id into v_user_id from interac_private.sandbox_attempts where id = p_attempt_id;
  if not found then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 9142073));
  update interac_private.sandbox_attempts a set phase = p_outcome, updated_at = clock_timestamp()
    where a.id = p_attempt_id and a.phase = 'claimed'
      and a.updated_at + interval '2 minutes' > clock_timestamp()
      and exists (select 1 from public.professional_accounts p where p.user_id = v_user_id and p.review_status <> 'suspended');
  return found;
end;
$$;

create function interac_private.my_status()
returns table(status text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select coalesce(
    case
      when a.phase = 'pending' and a.expires_at <= now() then 'expired'
      when a.phase = 'claimed' and a.updated_at + interval '2 minutes' <= now() then 'expired'
      when a.phase = 'claimed' then 'pending'
      else a.phase
    end
  , 'not_started'), a.updated_at
  from (select auth.uid() as user_id) viewer
  left join lateral (
    select x.phase, x.expires_at, x.updated_at from interac_private.sandbox_attempts x
      where x.user_id = viewer.user_id order by x.created_at desc, x.id desc limit 1
  ) a on true
  where viewer.user_id is not null;
$$;

-- PostgREST exposes only these invoker entry points. Only the status projection
-- accepts end-user credentials, and it has no subject/account selector.
create function public.interac_sandbox_start(
  p_user_id uuid, p_state_hash text, p_browser_hash text, p_nonce text, p_verifier text
) returns uuid language sql security invoker set search_path = '' as $$
  select interac_private.start_attempt(p_user_id,p_state_hash,p_browser_hash,p_nonce,p_verifier);
$$;
create function public.interac_sandbox_claim(p_state_hash text, p_browser_hash text)
returns table(attempt_id uuid, user_id uuid, nonce text, verifier text)
language sql security invoker set search_path = '' as $$
  select * from interac_private.claim_attempt(p_state_hash,p_browser_hash);
$$;
create function public.interac_sandbox_finish(p_attempt_id uuid, p_outcome text)
returns boolean language sql security invoker set search_path = '' as $$
  select interac_private.finish_attempt(p_attempt_id,p_outcome);
$$;
create function public.get_my_interac_sandbox_status() returns table(status text, updated_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from interac_private.my_status();
$$;

revoke all on all functions in schema interac_private from public, anon, authenticated, service_role;
revoke all on function public.interac_sandbox_start(uuid,text,text,text,text),
  public.interac_sandbox_claim(text,text), public.interac_sandbox_finish(uuid,text),
  public.get_my_interac_sandbox_status() from public, anon, authenticated, service_role;
grant execute on function interac_private.start_attempt(uuid,text,text,text,text),
  interac_private.claim_attempt(text,text), interac_private.finish_attempt(uuid,text),
  public.interac_sandbox_start(uuid,text,text,text,text), public.interac_sandbox_claim(text,text),
  public.interac_sandbox_finish(uuid,text) to service_role;
grant execute on function interac_private.my_status(), public.get_my_interac_sandbox_status() to authenticated;
commit;
