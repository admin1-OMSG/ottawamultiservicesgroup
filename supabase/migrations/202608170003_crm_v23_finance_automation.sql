-- CRM v2.3 - Finance automation and partner account summaries
-- Additive migration. Does not remove existing finance data.

alter table public.finance_transactions
  add column if not exists source_type text,
  add column if not exists source_id text,
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

create index if not exists finance_transactions_source_idx
  on public.finance_transactions(source_type, source_id);

create unique index if not exists finance_transactions_active_source_unique_idx
  on public.finance_transactions(source_type, source_id)
  where source_type is not null and source_id is not null and is_void = false;

create or replace function public.sync_payment_to_finance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_customer public.customers%rowtype;
  v_description text;
begin
  if tg_op = 'DELETE' then
    update public.finance_transactions
       set is_void = true,
           updated_at = now(),
           notes = concat_ws(E'\n', notes, 'Automatically voided because the source payment was deleted.')
     where source_type = 'payment'
       and source_id = old.id::text
       and is_void = false;
    return old;
  end if;

  select * into v_invoice from public.invoices where id = new.invoice_id;
  if v_invoice.customer_id is not null then
    select * into v_customer from public.customers where id = v_invoice.customer_id;
  end if;

  v_description := case
    when v_invoice.invoice_number is not null then 'Customer payment - ' || v_invoice.invoice_number
    else 'Customer payment'
  end;

  update public.finance_transactions
     set transaction_date = new.payment_date,
         direction = 'income',
         classification = 'operating_revenue',
         category = 'Service revenue',
         description = v_description,
         counterparty = nullif(trim(concat_ws(' ', v_customer.first_name, v_customer.last_name)), ''),
         subtotal = new.amount,
         tax_amount = 0,
         total = new.amount,
         payment_method = new.method,
         paid_by = 'Customer',
         reference = coalesce(new.reference, v_invoice.invoice_number),
         invoice_id = new.invoice_id,
         payment_id = new.id,
         customer_id = v_invoice.customer_id,
         updated_at = now(),
         is_void = false
   where source_type = 'payment'
     and source_id = new.id::text
     and is_void = false;

  if not found then
    insert into public.finance_transactions (
      transaction_date, direction, classification, category, description,
      counterparty, subtotal, tax_amount, total, payment_method, paid_by,
      reference, invoice_id, payment_id, customer_id,
      source_type, source_id, created_by, updated_by
    ) values (
      new.payment_date, 'income', 'operating_revenue', 'Service revenue', v_description,
      nullif(trim(concat_ws(' ', v_customer.first_name, v_customer.last_name)), ''),
      new.amount, 0, new.amount, new.method, 'Customer',
      coalesce(new.reference, v_invoice.invoice_number), new.invoice_id, new.id, v_invoice.customer_id,
      'payment', new.id::text, new.created_by, new.created_by
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_payment_to_finance on public.payments;
create trigger trg_sync_payment_to_finance
after insert or update or delete on public.payments
for each row execute function public.sync_payment_to_finance();

-- Backfill payments that existed before v2.3. Existing source-linked entries are skipped.
insert into public.finance_transactions (
  transaction_date, direction, classification, category, description,
  counterparty, subtotal, tax_amount, total, payment_method, paid_by,
  reference, invoice_id, payment_id, customer_id,
  source_type, source_id, created_by, updated_by
)
select
  p.payment_date,
  'income',
  'operating_revenue',
  'Service revenue',
  'Customer payment - ' || i.invoice_number,
  nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
  p.amount,
  0,
  p.amount,
  p.method,
  'Customer',
  coalesce(p.reference, i.invoice_number),
  p.invoice_id,
  p.id,
  i.customer_id,
  'payment',
  p.id::text,
  p.created_by,
  p.created_by
from public.payments p
join public.invoices i on i.id = p.invoice_id
left join public.customers c on c.id = i.customer_id
where not exists (
  select 1 from public.finance_transactions ft
  where ft.source_type = 'payment'
    and ft.source_id = p.id::text
    and ft.is_void = false
);
