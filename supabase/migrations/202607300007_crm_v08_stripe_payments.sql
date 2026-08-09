-- Ottawa Multiservices Group CRM v0.8
-- Stripe Checkout payments, idempotent webhook recording and customer visibility.

create table if not exists public.stripe_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  checkout_url text,
  payment_type text not null default 'full' check (payment_type in ('full','deposit')),
  amount numeric(12,2) not null check (amount > 0),
  currency char(3) not null default 'CAD',
  status text not null default 'creating' check (status in ('creating','open','complete','expired','failed')),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists stripe_checkout_invoice_idx on public.stripe_checkout_sessions(invoice_id);
create index if not exists stripe_checkout_customer_idx on public.stripe_checkout_sessions(customer_id);
create index if not exists stripe_checkout_status_idx on public.stripe_checkout_sessions(status);

alter table public.payments
  add column if not exists provider text not null default 'manual',
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

create unique index if not exists payments_stripe_session_unique
  on public.payments(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create unique index if not exists payments_stripe_intent_unique
  on public.payments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

alter table public.stripe_checkout_sessions enable row level security;

drop policy if exists "Active admins can read Stripe checkout sessions" on public.stripe_checkout_sessions;
create policy "Active admins can read Stripe checkout sessions"
on public.stripe_checkout_sessions for select to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));

drop policy if exists "Customers can read own Stripe checkout sessions" on public.stripe_checkout_sessions;
create policy "Customers can read own Stripe checkout sessions"
on public.stripe_checkout_sessions for select to authenticated
using (
  exists(
    select 1 from public.customer_accounts ca
    where ca.auth_user_id=auth.uid()
      and ca.customer_id=stripe_checkout_sessions.customer_id
  )
);

-- Called only by the Stripe webhook through the service-role client.
-- It is idempotent: the same Checkout Session or PaymentIntent cannot create two payments.
create or replace function public.record_stripe_checkout_payment(
  p_stripe_session_id text,
  p_payment_intent_id text,
  p_amount numeric,
  p_paid_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  checkout_row public.stripe_checkout_sessions%rowtype;
  invoice_row public.invoices%rowtype;
  existing_payment_id uuid;
  new_paid numeric(12,2);
  new_balance numeric(12,2);
  new_status text;
begin
  if coalesce(p_stripe_session_id,'')='' then raise exception 'Stripe session ID is required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Payment amount must be positive'; end if;

  select * into checkout_row
  from public.stripe_checkout_sessions
  where stripe_session_id=p_stripe_session_id
  for update;

  if not found then raise exception 'Unknown Stripe checkout session'; end if;

  select id into existing_payment_id
  from public.payments
  where stripe_checkout_session_id=p_stripe_session_id
     or (p_payment_intent_id is not null and stripe_payment_intent_id=p_payment_intent_id)
  limit 1;

  if existing_payment_id is not null then
    return jsonb_build_object('ok',true,'duplicate',true,'payment_id',existing_payment_id);
  end if;

  select * into invoice_row
  from public.invoices
  where id=checkout_row.invoice_id
  for update;

  if not found then raise exception 'Invoice not found'; end if;

  insert into public.payments(
    invoice_id, amount, payment_date, method, reference, notes, provider,
    stripe_checkout_session_id, stripe_payment_intent_id, created_by
  ) values (
    invoice_row.id, p_amount, (p_paid_at at time zone 'UTC')::date,
    'credit_card', p_stripe_session_id, 'Stripe Checkout payment', 'stripe',
    p_stripe_session_id, p_payment_intent_id, checkout_row.created_by
  ) returning id into existing_payment_id;

  select coalesce(sum(amount),0)::numeric(12,2) into new_paid
  from public.payments where invoice_id=invoice_row.id;

  new_balance := greatest(0, invoice_row.total-new_paid);
  new_status := case when new_balance=0 then 'paid' else 'partially_paid' end;

  update public.invoices
  set amount_paid=new_paid,
      balance_due=new_balance,
      status=new_status,
      updated_at=now()
  where id=invoice_row.id;

  update public.stripe_checkout_sessions
  set status='complete',
      stripe_payment_intent_id=p_payment_intent_id,
      completed_at=p_paid_at,
      updated_at=now()
  where id=checkout_row.id;

  return jsonb_build_object(
    'ok',true,
    'duplicate',false,
    'payment_id',existing_payment_id,
    'invoice_id',invoice_row.id,
    'invoice_status',new_status,
    'balance_due',new_balance
  );
end;
$$;

revoke all on function public.record_stripe_checkout_payment(text,text,numeric,timestamptz) from public;
revoke all on function public.record_stripe_checkout_payment(text,text,numeric,timestamptz) from anon;
revoke all on function public.record_stripe_checkout_payment(text,text,numeric,timestamptz) from authenticated;
grant execute on function public.record_stripe_checkout_payment(text,text,numeric,timestamptz) to service_role;
