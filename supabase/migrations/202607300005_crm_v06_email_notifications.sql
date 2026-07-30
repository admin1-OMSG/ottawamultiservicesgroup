-- Ottawa Multiservices Group CRM v0.6
-- Transactional email notification audit log.

create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('quote_requested','estimate_accepted','estimate_ready','appointment_proposed')),
  record_id uuid not null,
  recipient_email text not null,
  recipient_type text not null check (recipient_type in ('admin','customer')),
  subject text not null,
  provider_message_id text,
  status text not null default 'sent' check (status in ('sent','failed')),
  idempotency_key text not null unique,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_notifications_record_idx on public.email_notifications(record_id);
create index if not exists email_notifications_created_idx on public.email_notifications(created_at desc);

alter table public.email_notifications enable row level security;

drop policy if exists "Active admins can read email notifications" on public.email_notifications;
create policy "Active admins can read email notifications" on public.email_notifications
for select to authenticated using (
  exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true)
);
