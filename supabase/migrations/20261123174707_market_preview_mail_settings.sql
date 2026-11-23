begin;

create domain market_private.preview_mailbox as text
  check (
    octet_length(value) <= 254
    and octet_length(split_part(value, '@', 1)) <= 64
    and value collate "C" ~ $mail$^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$$mail$
  );

create table market_private.preview_mail_settings (
  singleton boolean primary key default true check (singleton),
  recipient market_private.preview_mailbox not null,
  sender market_private.preview_mailbox not null
);

alter table market_private.preview_mail_settings enable row level security;
revoke all on market_private.preview_mail_settings from public, anon, authenticated, service_role;

create function market_private.read_preview_mail_settings() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('recipient', s.recipient, 'sender', s.sender)
  from market_private.preview_mail_settings s where s.singleton;
$$;

create function public.market_preview_mail_settings() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select market_private.read_preview_mail_settings();
$$;

revoke all on function market_private.read_preview_mail_settings(), public.market_preview_mail_settings()
  from public, anon, authenticated, service_role;
grant execute on function market_private.read_preview_mail_settings(), public.market_preview_mail_settings()
  to service_role;

commit;
