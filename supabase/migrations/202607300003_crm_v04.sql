-- Ottawa Multiservices Group CRM v0.4
-- Invoices and payments
create sequence if not exists public.invoice_number_seq start 1;
create or replace function public.generate_invoice_number() returns text language plpgsql security definer set search_path=public as $$
begin return 'INV-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text,6,'0'); end; $$;

create table if not exists public.invoices (
 id uuid primary key default gen_random_uuid(), invoice_number text not null unique default public.generate_invoice_number(),
 customer_id uuid not null references public.customers(id) on delete restrict,
 estimate_id uuid references public.estimates(id) on delete set null, job_id uuid references public.jobs(id) on delete set null,
 title text, status text not null default 'draft' check(status in ('draft','sent','partially_paid','paid','overdue','void')),
 issue_date date not null default current_date, due_date date, subtotal numeric(12,2) not null default 0,
 discount_total numeric(12,2) not null default 0, tax_rate numeric(7,6) not null default .13, tax_total numeric(12,2) not null default 0,
 total numeric(12,2) not null default 0, amount_paid numeric(12,2) not null default 0, balance_due numeric(12,2) not null default 0,
 currency char(3) not null default 'CAD', notes text, terms text, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.invoice_items (
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade,
 position int not null default 1, description text not null, quantity numeric(12,2) not null default 1, unit_price numeric(12,2) not null default 0,
 line_total numeric(12,2) not null default 0, created_at timestamptz not null default now(), unique(invoice_id,position)
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade,
 amount numeric(12,2) not null check(amount>0), payment_date date not null default current_date,
 method text not null default 'other' check(method in ('cash','credit_card','debit_card','etransfer','cheque','bank_transfer','other')),
 reference text, notes text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists invoices_customer_idx on public.invoices(customer_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists payments_invoice_idx on public.payments(invoice_id);
alter table public.invoices enable row level security; alter table public.invoice_items enable row level security; alter table public.payments enable row level security;
create policy "Active admins can manage invoices" on public.invoices for all to authenticated using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true)) with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));
create policy "Active admins can manage invoice items" on public.invoice_items for all to authenticated using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true)) with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));
create policy "Active admins can manage payments" on public.payments for all to authenticated using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true)) with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));
