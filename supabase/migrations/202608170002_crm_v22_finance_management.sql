-- CRM v2.2 - Finance & expense management
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null default current_date,
  direction text not null check (direction in ('income','expense','funding')),
  classification text not null check (classification in ('operating_revenue','operating_expense','capital_asset','partner_financing','employee_contractor','other')),
  category text not null,
  description text not null,
  counterparty text,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  payment_method text,
  paid_by text,
  partner_name text,
  employee_id uuid references public.employees(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  inventory_movement_id uuid references public.inventory_movements(id) on delete set null,
  reference text,
  recurring boolean not null default false,
  recurrence text,
  receipt_url text,
  notes text,
  is_void boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists finance_transactions_date_idx on public.finance_transactions(transaction_date desc);
create index if not exists finance_transactions_classification_idx on public.finance_transactions(classification);
create index if not exists finance_transactions_job_idx on public.finance_transactions(job_id);
create index if not exists finance_transactions_inventory_idx on public.finance_transactions(inventory_item_id);
alter table public.finance_transactions enable row level security;
drop policy if exists "Active admins manage finance transactions" on public.finance_transactions;
create policy "Active admins manage finance transactions" on public.finance_transactions for all to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true))
with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));

-- Optional financial metadata on inventory. Existing item_type remains the operational source of truth.
alter table public.inventory_items add column if not exists purchase_date date;
alter table public.inventory_items add column if not exists financial_notes text;
