begin;

create index market_notifications_role_page_idx
  on market_private.notifications(recipient_id, recipient_is_provider, created_at desc, id desc);
create index market_notifications_role_unread_idx
  on market_private.notifications(recipient_id, recipient_is_provider) where read_at is null;

create function market_private.inbox(
  p_as_provider boolean, p_include_items boolean, p_before_at timestamptz, p_before_id uuid
) returns jsonb language sql stable security definer set search_path='' as $$
  with visible as not materialized (
    select n.id, n.kind, n.request_id, n.contact_id, n.created_at, n.read_at, r.title as request_title,
      coalesce(nullif(a.business_name, ''), a.contact_name) as provider_name
    from market_private.notifications n
    join public.professional_accounts a on a.id = n.provider_id
    join market_private.requests r on r.id = n.request_id
    where n.recipient_id = (select auth.uid()) and n.recipient_is_provider = p_as_provider
      and (not p_as_provider or a.review_status = 'approved')
      and (r.status = 'open' or n.kind not in ('match', 'invitation'))
  ), page as (
    select * from visible
    where p_include_items and (p_before_at is null or (created_at, id) < (p_before_at, p_before_id))
    order by created_at desc, id desc limit 26
  ), items as (
    select * from page order by created_at desc, id desc limit 25
  )
  select jsonb_build_object(
    'unread', (select count(*) from visible where read_at is null),
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc, i.id desc) from items i), '[]'::jsonb),
    'has_older', exists(select 1 from page offset 25)
  );
$$;

create function public.market_inbox(
  p_as_provider boolean, p_include_items boolean, p_before_at timestamptz, p_before_id uuid
) returns jsonb language sql stable security invoker set search_path='' as $$
  select market_private.inbox(p_as_provider, p_include_items, p_before_at, p_before_id);
$$;

revoke all on function public.market_inbox(boolean,boolean,timestamptz,uuid),
  market_private.inbox(boolean,boolean,timestamptz,uuid) from public,anon,authenticated,service_role;
grant execute on function public.market_inbox(boolean,boolean,timestamptz,uuid),
  market_private.inbox(boolean,boolean,timestamptz,uuid) to authenticated;

commit;
