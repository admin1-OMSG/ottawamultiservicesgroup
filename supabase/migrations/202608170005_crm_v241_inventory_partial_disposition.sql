-- CRM v2.4.1 - Partial equipment disposition
-- Supports selling/losing part of an equipment quantity, reduces active stock,
-- and records the exact capital removed without deleting financial history.

-- Stop the v2.4 update trigger: dispositions are now explicit RPC transactions.
drop trigger if exists trg_sync_inventory_disposition_to_finance on public.inventory_items;
drop function if exists public.sync_inventory_disposition_to_finance();

alter table public.inventory_items
  add column if not exists disposed_quantity_total numeric(14,3) not null default 0,
  add column if not exists last_disposition_type text,
  add column if not exists last_disposition_quantity numeric(14,3) not null default 0,
  add column if not exists last_sale_proceeds numeric(12,2) not null default 0;

alter table public.inventory_items drop constraint if exists inventory_items_last_disposition_type_check;
alter table public.inventory_items add constraint inventory_items_last_disposition_type_check
  check (last_disposition_type is null or last_disposition_type in ('sold','lost'));

alter table public.inventory_items drop constraint if exists inventory_items_disposed_quantity_total_check;
alter table public.inventory_items add constraint inventory_items_disposed_quantity_total_check
  check (disposed_quantity_total >= 0 and last_disposition_quantity >= 0 and last_sale_proceeds >= 0);

-- Reconcile any v2.4 item already marked Sold/Lost. v2.4 reduced capital but did not reduce stock.
-- Infer the disposed quantity from disposition_value / unit_cost where possible.
with inferred as (
  select id,
         least(quantity,
           case
             when unit_cost > 0 and disposition_value > 0 then disposition_value / unit_cost
             when quantity > 0 then quantity
             else 0
           end
         )::numeric(14,3) as qty,
         availability_status as dtype
  from public.inventory_items
  where item_type='equipment'
    and availability_status in ('sold','lost')
    and coalesce(disposition_value,0) > 0
)
update public.inventory_items i
set quantity = greatest(i.quantity - x.qty, 0),
    disposed_quantity_total = i.disposed_quantity_total + x.qty,
    last_disposition_type = x.dtype,
    last_disposition_quantity = x.qty,
    availability_status = case when greatest(i.quantity - x.qty,0) > 0 then 'available' else x.dtype end,
    updated_at = now()
from inferred x
where i.id=x.id and x.qty > 0;

create or replace function public.inventory_dispose_equipment(
  p_item_id uuid,
  p_quantity numeric,
  p_disposition_type text,
  p_disposition_date date default current_date,
  p_note text default null,
  p_sale_proceeds numeric default 0
)
returns numeric
language plpgsql
security definer
set search_path=public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_after numeric(14,3);
  v_capital numeric(12,2);
  v_event_id uuid := gen_random_uuid();
  v_admin uuid := auth.uid();
begin
  if not exists(select 1 from public.admin_users a where a.id=v_admin and a.is_active=true) then
    raise exception 'Active administrator required';
  end if;
  if p_disposition_type not in ('sold','lost') then raise exception 'Disposition must be sold or lost'; end if;
  if coalesce(p_quantity,0) <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  if coalesce(p_sale_proceeds,0) < 0 then raise exception 'Sale proceeds cannot be negative'; end if;

  select * into v_item from public.inventory_items where id=p_item_id for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if v_item.item_type <> 'equipment' then raise exception 'Only equipment can use this disposition action'; end if;
  if p_quantity > v_item.quantity then raise exception 'Disposed quantity cannot exceed available quantity'; end if;

  v_after := v_item.quantity - p_quantity;
  v_capital := round((p_quantity * coalesce(v_item.unit_cost,0))::numeric,2);

  update public.inventory_items
     set quantity=v_after,
         disposed_quantity_total=coalesce(disposed_quantity_total,0)+p_quantity,
         last_disposition_type=p_disposition_type,
         last_disposition_quantity=p_quantity,
         last_sale_proceeds=case when p_disposition_type='sold' then coalesce(p_sale_proceeds,0) else 0 end,
         availability_status=case when v_after <= 0 then p_disposition_type else 'available' end,
         disposition_date=coalesce(p_disposition_date,current_date),
         disposition_note=nullif(btrim(coalesce(p_note,'')),''),
         disposition_value=v_capital,
         updated_at=now(), updated_by=v_admin
   where id=p_item_id;

  insert into public.inventory_movements(item_id,movement_type,quantity_change,quantity_before,quantity_after,reason,reference,created_by)
  values(
    p_item_id,'out',-p_quantity,v_item.quantity,v_after,
    initcap(p_disposition_type)||' equipment'||case when nullif(btrim(coalesce(p_note,'')),'') is not null then ': '||btrim(p_note) else '' end,
    v_item.sku,v_admin
  );

  insert into public.finance_transactions(
    transaction_date,direction,classification,category,description,subtotal,tax_amount,total,
    paid_by,inventory_item_id,reference,notes,source_type,source_id,created_by,updated_by
  ) values (
    coalesce(p_disposition_date,current_date),'expense','capital_adjustment',
    case when p_disposition_type='sold' then 'Asset sold / removed' else 'Asset lost / removed' end,
    'Equipment '||p_disposition_type||' - '||v_item.name||' ('||trim(to_char(p_quantity,'FM999999990.###'))||' '||v_item.unit||')',
    v_capital,0,v_capital,'Company',p_item_id,v_item.sku,nullif(btrim(coalesce(p_note,'')),''),
    'inventory_disposition',v_event_id::text,v_admin,v_admin
  );

  -- Sale proceeds are financing/other income, not normal service revenue.
  if p_disposition_type='sold' and coalesce(p_sale_proceeds,0) > 0 then
    insert into public.finance_transactions(
      transaction_date,direction,classification,category,description,subtotal,tax_amount,total,
      paid_by,inventory_item_id,reference,notes,source_type,source_id,created_by,updated_by
    ) values (
      coalesce(p_disposition_date,current_date),'income','other','Asset sale proceeds',
      'Sale proceeds - '||v_item.name,
      round(p_sale_proceeds::numeric,2),0,round(p_sale_proceeds::numeric,2),'Other',p_item_id,v_item.sku,
      nullif(btrim(coalesce(p_note,'')),''),'inventory_sale',v_event_id::text,v_admin,v_admin
    );
  end if;

  return v_after;
end;
$$;

grant execute on function public.inventory_dispose_equipment(uuid,numeric,text,date,text,numeric) to authenticated;

create index if not exists inventory_items_last_disposition_idx on public.inventory_items(last_disposition_type,disposition_date);
