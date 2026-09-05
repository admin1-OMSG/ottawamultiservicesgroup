-- OMSG v2.5.1 - Meta Ads demographic and geographic breakdowns
-- Adds storage for segmented Meta performance without changing existing campaign metrics.

create table if not exists public.marketing_campaign_breakdown_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  metric_date date not null,
  breakdown_type text not null check (breakdown_type in ('age','region','country')),
  breakdown_value text not null,
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  conversations integer not null default 0,
  leads integer not null default 0,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (campaign_id, metric_date, breakdown_type, breakdown_value)
);

create index if not exists marketing_breakdown_campaign_idx
  on public.marketing_campaign_breakdown_metrics(campaign_id);

create index if not exists marketing_breakdown_type_value_idx
  on public.marketing_campaign_breakdown_metrics(breakdown_type, breakdown_value);

create index if not exists marketing_breakdown_date_idx
  on public.marketing_campaign_breakdown_metrics(metric_date desc);

alter table public.marketing_campaign_breakdown_metrics enable row level security;

drop policy if exists "Active admins can read marketing breakdown metrics"
  on public.marketing_campaign_breakdown_metrics;

create policy "Active admins can read marketing breakdown metrics"
on public.marketing_campaign_breakdown_metrics
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.id = auth.uid()
      and au.is_active = true
  )
);

-- Writes are intentionally performed by the sync-meta-ads Edge Function
-- with the service-role client, not directly by browser users.
