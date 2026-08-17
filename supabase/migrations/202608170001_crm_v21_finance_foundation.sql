-- Ottawa Multiservices Group CRM v2.1
-- Finance & Accounting foundation
-- Safe additive migration: preserves existing CRM data and functionality.

-- =========================================================
-- 1. COMPANY OWNERS / SHAREHOLDERS
-- Separate from public.partners, which represents external
-- partners / subcontractors.
-- =========================================================

create table if not exists public.company_owners (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  display_name text,
  ownership_percent numeric(6,3)
    check (
      ownership_percent is null
      or (ownership_percent >= 0 and ownership_percent <= 100)
    ),
  status text not null default 'active'
    check (status in ('active','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists company_owners_status_idx
  on public.company_owners(status);


-- =========================================================
-- 2. CENTRAL FINANCIAL TRANSACTIONS LEDGER
--
-- This is the common financial audit trail.
-- It does NOT replace invoices/payments.
-- Source links prevent accidental duplicate accounting entries.
-- =========================================================

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),

  transaction_date date not null default current_date,

  transaction_type text not null check (
    transaction_type in (
      'operating_revenue',
      'customer_payment',
      'operating_expense',
      'capital_asset_purchase',
      'owner_contribution',
      'owner_advance',
      'owner_advance_repayment',
      'owner_reimbursement',
      'employee_payroll',
      'contractor_expense',
      'customer_refund',
      'asset_sale',
      'tax_payment',
      'other'
    )
  ),

  direction text not null
    check (direction in ('inflow','outflow','non_cash')),

  category text,
  subcategory text,
  description text not null,

  amount_before_tax numeric(14,2) not null default 0
    check (amount_before_tax >= 0),

  tax_amount numeric(14,2) not null default 0
    check (tax_amount >= 0),

  total_amount numeric(14,2) not null default 0
    check (total_amount >= 0),

  currency char(3) not null default 'CAD',

  payment_method text,
  paid_by text,

  -- Optional CRM relationships
  customer_id uuid references public.customers(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  owner_id uuid references public.company_owners(id) on delete set null,

  -- Used to identify the original CRM record that created this entry.
  source_type text,
  source_id text,

  reference text,
  notes text,

  status text not null default 'posted'
    check (status in ('draft','posted','voided','reversed')),

  is_test boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists financial_transactions_date_idx
  on public.financial_transactions(transaction_date desc);

create index if not exists financial_transactions_type_idx
  on public.financial_transactions(transaction_type);

create index if not exists financial_transactions_job_idx
  on public.financial_transactions(job_id);

create index if not exists financial_transactions_owner_idx
  on public.financial_transactions(owner_id);

create index if not exists financial_transactions_test_idx
  on public.financial_transactions(is_test);

-- Prevent the exact same CRM source record from generating the
-- same financial transaction type more than once.
create unique index if not exists financial_transactions_source_unique_idx
  on public.financial_transactions(source_type, source_id, transaction_type)
  where source_type is not null
    and source_id is not null
    and status <> 'voided';


-- =========================================================
-- 3. OWNER TRANSACTIONS
--
-- Contributions, advances, reimbursements and company expenses
-- paid personally by an owner.
-- These are NOT automatically operating revenue.
-- =========================================================

create table if not exists public.owner_transactions (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references public.company_owners(id) on delete restrict,

  transaction_date date not null default current_date,

  transaction_type text not null check (
    transaction_type in (
      'initial_contribution',
      'additional_contribution',
      'company_expense_paid_personally',
      'reimbursement_due',
      'reimbursement_paid',
      'advance_to_owner',
      'advance_repaid',
      'payment_to_owner',
      'other'
    )
  ),

  amount numeric(14,2) not null check (amount > 0),

  financial_transaction_id uuid
    references public.financial_transactions(id) on delete set null,

  job_id uuid references public.jobs(id) on delete set null,

  description text,
  reference text,
  notes text,

  is_test boolean not null default false,

  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists owner_transactions_owner_date_idx
  on public.owner_transactions(owner_id, transaction_date desc);

create unique index if not exists owner_transactions_financial_unique_idx
  on public.owner_transactions(financial_transaction_id)
  where financial_transaction_id is not null;


-- =========================================================
-- 4. OPERATING EXPENSES
-- =========================================================

create table if not exists public.operating_expenses (
  id uuid primary key default gen_random_uuid(),

  expense_date date not null default current_date,

  vendor text,
  description text not null,
  category text not null,
  subcategory text,

  job_id uuid references public.jobs(id) on delete set null,

  amount_before_tax numeric(14,2) not null default 0
    check (amount_before_tax >= 0),

  gst_amount numeric(14,2) not null default 0
    check (gst_amount >= 0),

  hst_amount numeric(14,2) not null default 0
    check (hst_amount >= 0),

  other_tax_amount numeric(14,2) not null default 0
    check (other_tax_amount >= 0),

  total_amount numeric(14,2) not null default 0
    check (total_amount >= 0),

  payment_method text,
  paid_by text,

  owner_id uuid references public.company_owners(id) on delete set null,

  receipt_reference text,

  financial_transaction_id uuid
    references public.financial_transactions(id) on delete set null,

  notes text,
  is_test boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists operating_expenses_date_idx
  on public.operating_expenses(expense_date desc);

create index if not exists operating_expenses_category_idx
  on public.operating_expenses(category);

create index if not exists operating_expenses_job_idx
  on public.operating_expenses(job_id);

create unique index if not exists operating_expenses_financial_unique_idx
  on public.operating_expenses(financial_transaction_id)
  where financial_transaction_id is not null;


-- =========================================================
-- 5. CAPITAL ASSETS / EQUIPMENT REGISTER
-- =========================================================

create table if not exists public.capital_assets (
  id uuid primary key default gen_random_uuid(),

  asset_code text unique,
  name text not null,
  category text,
  description text,

  inventory_item_id uuid
    references public.inventory_items(id) on delete set null,

  acquisition_date date,
  vendor text,

  purchase_price_before_tax numeric(14,2) not null default 0
    check (purchase_price_before_tax >= 0),

  tax_amount numeric(14,2) not null default 0
    check (tax_amount >= 0),

  acquisition_cost numeric(14,2) not null default 0
    check (acquisition_cost >= 0),

  paid_by text,
  owner_id uuid references public.company_owners(id) on delete set null,

  serial_number text,
  warranty_expiry date,
  location text,

  condition text,
  status text not null default 'active'
    check (
      status in (
        'active',
        'in_storage',
        'under_repair',
        'lost',
        'sold',
        'disposed',
        'retired'
      )
    ),

  purchase_reference text,

  financial_transaction_id uuid
    references public.financial_transactions(id) on delete set null,

  disposal_date date,
  disposal_amount numeric(14,2)
    check (disposal_amount is null or disposal_amount >= 0),

  notes text,
  is_test boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists capital_assets_status_idx
  on public.capital_assets(status);

create index if not exists capital_assets_inventory_idx
  on public.capital_assets(inventory_item_id);

create unique index if not exists capital_assets_financial_unique_idx
  on public.capital_assets(financial_transaction_id)
  where financial_transaction_id is not null;


-- =========================================================
-- 6. SUBSCRIPTIONS / RECURRING COSTS
-- =========================================================

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),

  provider text not null,
  subscription_name text not null,
  category text,

  amount_before_tax numeric(14,2) not null default 0
    check (amount_before_tax >= 0),

  tax_amount numeric(14,2) not null default 0
    check (tax_amount >= 0),

  total_amount numeric(14,2) not null default 0
    check (total_amount >= 0),

  currency char(3) not null default 'CAD',

  billing_frequency text not null default 'monthly'
    check (
      billing_frequency in (
        'monthly',
        'quarterly',
        'semiannual',
        'annual',
        'other'
      )
    ),

  start_date date,
  next_billing_date date,
  renewal_date date,

  auto_renew boolean not null default false,

  payment_method text,
  paid_by text,
  owner_id uuid references public.company_owners(id) on delete set null,

  status text not null default 'active'
    check (status in ('active','paused','cancelled','expired')),

  notes text,
  is_test boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists subscriptions_status_idx
  on public.subscriptions(status);

create index if not exists subscriptions_next_billing_idx
  on public.subscriptions(next_billing_date);


-- =========================================================
-- 7. PAYROLL ENTRIES
--
-- Separate from employees.
-- Does not attempt to replace certified payroll software.
-- =========================================================

create table if not exists public.payroll_entries (
  id uuid primary key default gen_random_uuid(),

  employee_id uuid not null
    references public.employees(id) on delete restrict,

  job_id uuid references public.jobs(id) on delete set null,

  work_date date,
  pay_date date,

  hours numeric(10,2)
    check (hours is null or hours >= 0),

  hourly_rate numeric(12,2)
    check (hourly_rate is null or hourly_rate >= 0),

  gross_amount numeric(14,2) not null default 0
    check (gross_amount >= 0),

  deductions_amount numeric(14,2) not null default 0
    check (deductions_amount >= 0),

  net_amount numeric(14,2) not null default 0
    check (net_amount >= 0),

  employer_cost numeric(14,2) not null default 0
    check (employer_cost >= 0),

  status text not null default 'pending'
    check (status in ('pending','paid','voided')),

  payment_method text,
  reference text,

  financial_transaction_id uuid
    references public.financial_transactions(id) on delete set null,

  notes text,
  is_test boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists payroll_entries_employee_idx
  on public.payroll_entries(employee_id);

create index if not exists payroll_entries_job_idx
  on public.payroll_entries(job_id);

create unique index if not exists payroll_entries_financial_unique_idx
  on public.payroll_entries(financial_transaction_id)
  where financial_transaction_id is not null;


-- =========================================================
-- 8. CONTRACTOR / SUBCONTRACTOR EXPENSES
-- Existing public.partners are used for external contractors.
-- =========================================================

create table if not exists public.contractor_expenses (
  id uuid primary key default gen_random_uuid(),

  partner_id uuid
    references public.partners(id) on delete set null,

  job_id uuid
    references public.jobs(id) on delete set null,

  expense_date date not null default current_date,

  invoice_number text,
  description text,

  amount_before_tax numeric(14,2) not null default 0
    check (amount_before_tax >= 0),

  tax_amount numeric(14,2) not null default 0
    check (tax_amount >= 0),

  total_amount numeric(14,2) not null default 0
    check (total_amount >= 0),

  status text not null default 'unpaid'
    check (status in ('unpaid','partially_paid','paid','voided')),

  payment_date date,
  payment_method text,
  reference text,

  financial_transaction_id uuid
    references public.financial_transactions(id) on delete set null,

  notes text,
  is_test boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists contractor_expenses_partner_idx
  on public.contractor_expenses(partner_id);

create index if not exists contractor_expenses_job_idx
  on public.contractor_expenses(job_id);

create unique index if not exists contractor_expenses_financial_unique_idx
  on public.contractor_expenses(financial_transaction_id)
  where financial_transaction_id is not null;


-- =========================================================
-- 9. OWNER / EMPLOYEE LABOUR TRACKING ON JOBS
--
-- Allows owner labour to be tracked without automatically
-- creating salary/payroll expenses.
-- =========================================================

create table if not exists public.job_labor_entries (
  id uuid primary key default gen_random_uuid(),

  job_id uuid not null
    references public.jobs(id) on delete cascade,

  worker_type text not null
    check (worker_type in ('owner','employee','contractor')),

  owner_id uuid
    references public.company_owners(id) on delete set null,

  employee_id uuid
    references public.employees(id) on delete set null,

  partner_id uuid
    references public.partners(id) on delete set null,

  work_date date not null default current_date,

  hours numeric(10,2) not null default 0
    check (hours >= 0),

  internal_hourly_cost numeric(12,2)
    check (
      internal_hourly_cost is null
      or internal_hourly_cost >= 0
    ),

  notes text,
  is_test boolean not null default false,

  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,

  check (
    (worker_type = 'owner' and owner_id is not null and employee_id is null and partner_id is null)
    or
    (worker_type = 'employee' and employee_id is not null and owner_id is null and partner_id is null)
    or
    (worker_type = 'contractor' and partner_id is not null and owner_id is null and employee_id is null)
  )
);

create index if not exists job_labor_entries_job_idx
  on public.job_labor_entries(job_id);

create index if not exists job_labor_entries_owner_idx
  on public.job_labor_entries(owner_id);


-- =========================================================
-- 10. EXTEND INVENTORY FOR FINANCIAL INTEGRATION
-- Existing item_type ('consumable','equipment') is preserved.
-- =========================================================

alter table public.inventory_items
  add column if not exists purchase_date date,
  add column if not exists purchase_reference text,
  add column if not exists tax_amount numeric(14,2) not null default 0,
  add column if not exists paid_by text,
  add column if not exists owner_id uuid references public.company_owners(id) on delete set null,
  add column if not exists financial_transaction_id uuid references public.financial_transactions(id) on delete set null,
  add column if not exists capital_asset_id uuid references public.capital_assets(id) on delete set null,
  add column if not exists is_test boolean not null default false;

alter table public.inventory_movements
  add column if not exists reason_code text,
  add column if not exists job_id uuid references public.jobs(id) on delete set null,
  add column if not exists unit_cost_snapshot numeric(14,2),
  add column if not exists allocated_cost numeric(14,2),
  add column if not exists financial_transaction_id uuid references public.financial_transactions(id) on delete set null,
  add column if not exists is_test boolean not null default false;

create index if not exists inventory_movements_job_idx
  on public.inventory_movements(job_id);

create index if not exists inventory_items_financial_idx
  on public.inventory_items(financial_transaction_id);


-- =========================================================
-- 11. PREVENT LOSS OF INVENTORY AUDIT HISTORY
--
-- Previous v1.5 used ON DELETE CASCADE for inventory movements.
-- Replace it with RESTRICT so an item with movement history cannot
-- silently erase its accounting/inventory history.
-- =========================================================

alter table public.inventory_movements
  drop constraint if exists inventory_movements_item_id_fkey;

alter table public.inventory_movements
  add constraint inventory_movements_item_id_fkey
  foreign key (item_id)
  references public.inventory_items(id)
  on delete restrict;


-- =========================================================
-- 12. TEST-DATA FLAGS ON EXISTING CORE TABLES
--
-- Existing records are NOT automatically changed here.
-- We will explicitly mark the existing demo records later.
-- =========================================================

alter table public.customers
  add column if not exists is_test boolean not null default false;

alter table public.estimates
  add column if not exists is_test boolean not null default false;

alter table public.jobs
  add column if not exists is_test boolean not null default false;

alter table public.invoices
  add column if not exists is_test boolean not null default false;

alter table public.payments
  add column if not exists is_test boolean not null default false;

alter table public.employees
  add column if not exists is_test boolean not null default false;

alter table public.partners
  add column if not exists is_test boolean not null default false;


-- =========================================================
-- 13. ROW LEVEL SECURITY
-- Finance data is restricted to active administrators.
-- =========================================================

alter table public.company_owners enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.owner_transactions enable row level security;
alter table public.operating_expenses enable row level security;
alter table public.capital_assets enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payroll_entries enable row level security;
alter table public.contractor_expenses enable row level security;
alter table public.job_labor_entries enable row level security;


drop policy if exists "Active admins manage company owners"
  on public.company_owners;

create policy "Active admins manage company owners"
  on public.company_owners
  for all to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  );


drop policy if exists "Active admins manage financial transactions"
  on public.financial_transactions;

create policy "Active admins manage financial transactions"
  on public.financial_transactions
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  );


drop policy if exists "Active admins manage owner transactions"
  on public.owner_transactions;

create policy "Active admins manage owner transactions"
  on public.owner_transactions
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  );


drop policy if exists "Active admins manage operating expenses"
  on public.operating_expenses;

create policy "Active admins manage operating expenses"
  on public.operating_expenses
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  );


drop policy if exists "Active admins manage capital assets"
  on public.capital_assets;

create policy "Active admins manage capital assets"
  on public.capital_assets
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  );


drop policy if exists "Active admins manage subscriptions"
  on public.subscriptions;

create policy "Active admins manage subscriptions"
  on public.subscriptions
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  );


drop policy if exists "Active admins manage payroll entries"
  on public.payroll_entries;

create policy "Active admins manage payroll entries"
  on public.payroll_entries
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  );


drop policy if exists "Active admins manage contractor expenses"
  on public.contractor_expenses;

create policy "Active admins manage contractor expenses"
  on public.contractor_expenses
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  );


drop policy if exists "Active admins manage job labor"
  on public.job_labor_entries;

create policy "Active admins manage job labor"
  on public.job_labor_entries
  for all to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = auth.uid()
        and au.is_active = true
    )
  );


-- =========================================================
-- END CRM v2.1 FINANCE FOUNDATION
-- =========================================================