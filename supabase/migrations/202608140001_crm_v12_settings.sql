-- CRM v1.2 - centralized business settings
create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null default 'Ottawa Multiservices Group Inc.',
  public_email text not null default 'info@ottawamultiservicesgroup.com',
  public_phone text not null default '(613) 407-6699',
  website_url text not null default 'https://www.ottawamultiservicesgroup.com',
  address_line text,
  city text not null default 'Ottawa',
  province text not null default 'Ontario',
  postal_code text,
  country text not null default 'Canada',
  gst_hst_number text,
  default_tax_rate numeric(6,5) not null default 0.13 check (default_tax_rate between 0 and 1),
  default_currency text not null default 'CAD',
  default_quote_valid_days integer not null default 30 check (default_quote_valid_days between 1 and 365),
  default_quote_terms text not null default 'This quote is valid for 30 days. Additional work requires authorization.',
  default_invoice_terms text not null default 'Payment is due according to the agreed service terms.',
  default_language text not null default 'en' check (default_language in ('en','fr')),
  timezone text not null default 'America/Toronto',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "Active admins can read app settings" on public.app_settings;
create policy "Active admins can read app settings"
on public.app_settings for select to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));

drop policy if exists "Active admins can update app settings" on public.app_settings;
create policy "Active admins can update app settings"
on public.app_settings for update to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true))
with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));
