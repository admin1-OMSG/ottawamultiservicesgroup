begin;

alter table market_private.requests drop constraint requests_status_check;
alter table market_private.requests add check(status in ('open','completed','withdrawn'));

create function market_private.withdraw(p_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_status text;
begin
  select status into v_status from market_private.requests where id=p_request_id and client_id=auth.uid() for update;
  if not found then raise exception 'market_request_unavailable' using errcode='42501'; end if;
  if v_status='withdrawn' then return; end if;
  if v_status<>'open' then raise exception 'market_request_closed' using errcode='22023'; end if;
  update market_private.requests set status='withdrawn' where id=p_request_id;
  perform market_private.touch();
end; $$;
create function public.market_withdraw(p_request_id uuid) returns void language sql security invoker set search_path='' as $$
  select market_private.withdraw(p_request_id);
$$;

create function market_private.request_closed() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.status<>'open' then raise exception 'market_request_closed' using errcode='22023'; end if;
  -- Keep the original notification, but stop dispatching pending invitations to
  -- a lead that can no longer be unlocked. Existing conversations stay available.
  update market_private.notifications set retry_at='infinity'::timestamptz,lease=null
    where request_id=new.id and kind in ('match','invitation') and delivered_at is null;
  return new;
end; $$;
create trigger market_request_closed before update of status on market_private.requests for each row
  when (old.status is distinct from new.status) execute function market_private.request_closed();

-- If this review and a new unlock run together both serialize on the request.
-- The original refund and any closure commit or roll back in the same transaction.
create function market_private.withdraw_mistaken_request() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update market_private.requests r set status='withdrawn'
    from market_private.contacts c where c.id=new.contact_id and c.request_id=r.id and r.status='open';
  return new;
end; $$;
create trigger market_withdraw_mistaken_request after update of status on market_billing.refunds for each row
  when (old.status='pending' and new.status='approved' and new.reason='request_in_error')
  execute function market_private.withdraw_mistaken_request();

create or replace function market_private.notifications() returns table (
  id uuid,kind text,request_id uuid,contact_id uuid,provider_name text,created_at timestamptz,read_at timestamptz
) language sql stable security definer set search_path='' as $$
  select n.id,n.kind,n.request_id,n.contact_id,coalesce(nullif(a.business_name,''),a.contact_name),n.created_at,n.read_at
  from market_private.notifications n join public.professional_accounts a on a.id=n.provider_id
  join market_private.requests r on r.id=n.request_id where n.recipient_id=auth.uid()
    and (not n.recipient_is_provider or a.review_status='approved')
    and (r.status='open' or n.kind not in ('match','invitation'))
  order by n.created_at desc,n.id;
$$;

revoke all on function public.market_withdraw(uuid),market_private.withdraw(uuid),market_private.request_closed(),
  market_private.withdraw_mistaken_request() from public,anon,authenticated,service_role;
grant execute on function public.market_withdraw(uuid),market_private.withdraw(uuid) to authenticated;

commit;
