-- CRM v2.4 - Inventory availability and equipment disposition
-- Keeps sold/lost equipment in inventory history and removes its value from active capital.

alter table public.inventory_items
  add column if not exists availability_status text not null default 'available',
  add column if not exists disposition_date date,
  add column if not exists disposition_note text,
  add column if not exists disposition_value numeric(12,2) not null default 0;

alter table public.inventory_items drop constraint if exists inventory_items_availability_status_check;
alter table public.inventory_items add constraint inventory_items_availability_status_check
  check (availability_status in ('available','unavailable','sold','lost'));

alter table public.inventory_items drop constraint if exists inventory_items_disposition_value_check;
alter table public.inventory_items add constraint inventory_items_disposition_value_check
  check (disposition_value >= 0);

-- Extend finance classification with a non-operating capital reduction class.
alter table public.finance_transactions drop constraint if exists finance_transactions_classification_check;
alter table public.finance_transactions add constraint finance_transactions_classification_check
  check (classification in ('operating_revenue','operating_expense','capital_asset','capital_adjustment','partner_financing','employee_contractor','other'));

create or replace function public.sync_inventory_disposition_to_finance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value numeric(12,2);
  v_desc text;
begin
  -- Only sold/lost equipment changes the active capital balance.
  if new.item_type = 'equipment' and new.availability_status in ('sold','lost') then
    v_value := greatest(coalesce(new.disposition_value,0),0);
    if v_value = 0 then v_value := greatest(coalesce(new.quantity,1),1) * coalesce(new.unit_cost,0); end if;
    v_desc := case when new.availability_status='sold' then 'Equipment sold - ' else 'Equipment lost - ' end || new.name;

    update public.finance_transactions
       set transaction_date=coalesce(new.disposition_date,current_date), direction='expense',
           classification='capital_adjustment',
           category=case when new.availability_status='sold' then 'Asset sold / removed' else 'Asset lost / removed' end,
           description=v_desc, subtotal=v_value, tax_amount=0, total=v_value,
           inventory_item_id=new.id, reference=new.sku, notes=new.disposition_note,
           updated_at=now(), is_void=false
     where source_type='inventory_disposition' and source_id=new.id::text and is_void=false;

    if not found then
      insert into public.finance_transactions(
        transaction_date,direction,classification,category,description,subtotal,tax_amount,total,
        paid_by,inventory_item_id,reference,notes,source_type,source_id,created_by,updated_by
      ) values (
        coalesce(new.disposition_date,current_date),'expense','capital_adjustment',
        case when new.availability_status='sold' then 'Asset sold / removed' else 'Asset lost / removed' end,
        v_desc,v_value,0,v_value,'Company',new.id,new.sku,new.disposition_note,
        'inventory_disposition',new.id::text,auth.uid(),auth.uid()
      );
    end if;
  else
    update public.finance_transactions
       set is_void=true, updated_at=now(), notes=concat_ws(E'\n',notes,'Voided because equipment is no longer marked Sold/Lost.')
     where source_type='inventory_disposition' and source_id=new.id::text and is_void=false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_inventory_disposition_to_finance on public.inventory_items;
create trigger trg_sync_inventory_disposition_to_finance
after update of item_type,availability_status,disposition_date,disposition_note,disposition_value,unit_cost,quantity
on public.inventory_items
for each row execute function public.sync_inventory_disposition_to_finance();

create index if not exists inventory_items_availability_idx on public.inventory_items(availability_status);
