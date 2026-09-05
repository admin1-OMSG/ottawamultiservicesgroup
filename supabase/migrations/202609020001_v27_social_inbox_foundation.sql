-- OMSG v2.7 - Unified Social Inbox foundation
-- Stores Facebook Messenger and Instagram Direct conversations/messages.
-- Does not modify existing Marketing tables.

create table if not exists public.social_conversations (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook','instagram')),
  external_conversation_id text,
  external_user_id text not null,
  contact_name text,
  contact_username text,
  profile_picture_url text,
  status text not null default 'new'
    check (status in ('new','open','waiting','qualified','closed','spam')),
  unread_count integer not null default 0,
  last_message_preview text,
  last_message_at timestamptz,
  customer_id uuid references public.customers(id) on delete set null,
  service_request_id uuid references public.service_requests(id) on delete set null,
  assigned_admin_id uuid references public.admin_users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, external_user_id)
);

create index if not exists social_conversations_last_message_idx
  on public.social_conversations(last_message_at desc);

create index if not exists social_conversations_status_idx
  on public.social_conversations(status);

create index if not exists social_conversations_customer_idx
  on public.social_conversations(customer_id);

create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.social_conversations(id) on delete cascade,
  platform text not null check (platform in ('facebook','instagram')),
  external_message_id text not null,
  direction text not null check (direction in ('inbound','outbound')),
  sender_external_id text,
  recipient_external_id text,
  message_type text not null default 'text'
    check (message_type in ('text','image','video','audio','file','sticker','share','unknown')),
  text_body text,
  attachment_url text,
  attachment_name text,
  raw_payload jsonb,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(platform, external_message_id)
);

create index if not exists social_messages_conversation_idx
  on public.social_messages(conversation_id, sent_at);

alter table public.social_conversations enable row level security;
alter table public.social_messages enable row level security;

drop policy if exists "Active admins manage social conversations"
  on public.social_conversations;
create policy "Active admins manage social conversations"
on public.social_conversations
for all to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.id = auth.uid() and au.is_active = true
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.id = auth.uid() and au.is_active = true
  )
);

drop policy if exists "Active admins manage social messages"
  on public.social_messages;
create policy "Active admins manage social messages"
on public.social_messages
for all to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.id = auth.uid() and au.is_active = true
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.id = auth.uid() and au.is_active = true
  )
);

create or replace function public.omsg_touch_social_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.social_conversations
  set
    last_message_preview = left(coalesce(new.text_body, '[' || new.message_type || ']'), 240),
    last_message_at = new.sent_at,
    unread_count = case
      when new.direction = 'inbound' then unread_count + 1
      else unread_count
    end,
    status = case
      when new.direction = 'inbound' and status in ('new','closed') then 'open'
      else status
    end,
    updated_at = now()
  where id = new.conversation_id;
  return new;
end
$$;

drop trigger if exists trg_omsg_touch_social_conversation
  on public.social_messages;

create trigger trg_omsg_touch_social_conversation
after insert on public.social_messages
for each row
execute function public.omsg_touch_social_conversation();

create or replace view public.social_inbox_summary as
select
  c.id,
  c.platform,
  c.external_user_id,
  c.contact_name,
  c.contact_username,
  c.status,
  c.unread_count,
  c.last_message_preview,
  c.last_message_at,
  c.customer_id,
  c.service_request_id,
  c.assigned_admin_id,
  c.created_at,
  c.updated_at
from public.social_conversations c;

grant select on public.social_inbox_summary to authenticated;
