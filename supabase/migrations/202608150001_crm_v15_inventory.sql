-- CRM v1.5 - Inventory management
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  category text,
  item_type text not null default 'consumable' check (item_type in ('consumable','equipment')),
  quantity numeric(14,3) not null default 0,
  unit text not null default 'unit',
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  supplier text,
  location text,
  status text not null default 'active' check (status in ('active','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);
create unique index if not exists inventory_items_sku_unique_idx on public.inventory_items(lower(sku)) where sku is not null and btrim(sku) <> '';
create index if not exists inventory_items_category_idx on public.inventory_items(category);
create index if not exists inventory_items_status_idx on public.inventory_items(status);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('in','out','adjustment')),
  quantity_change numeric(14,3) not null,
  quantity_before numeric(14,3) not null,
  quantity_after numeric(14,3) not null,
  reason text,
  reference text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index if not exists inventory_movements_item_created_idx on public.inventory_movements(item_id,created_at desc);

alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
drop policy if exists "Active admins manage inventory items" on public.inventory_items;
create policy "Active admins manage inventory items" on public.inventory_items for all to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true))
with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));
drop policy if exists "Active admins manage inventory movements" on public.inventory_movements;
create policy "Active admins manage inventory movements" on public.inventory_movements for all to authenticated
using (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true))
with check (exists(select 1 from public.admin_users au where au.id=auth.uid() and au.is_active=true));

create or replace function public.inventory_adjust_stock(p_item_id uuid, p_change numeric, p_type text, p_reason text default null, p_reference text default null)
returns numeric language plpgsql security invoker set search_path=public as $$
declare v_before numeric; v_after numeric;
begin
  if p_type not in ('in','out','adjustment') then raise exception 'Invalid movement type'; end if;
  select quantity into v_before from public.inventory_items where id=p_item_id for update;
  if not found then raise exception 'Inventory item not found'; end if;
  v_after := v_before + p_change;
  if v_after < 0 then raise exception 'Stock cannot be negative'; end if;
  update public.inventory_items set quantity=v_after,updated_at=now(),updated_by=auth.uid() where id=p_item_id;
  insert into public.inventory_movements(item_id,movement_type,quantity_change,quantity_before,quantity_after,reason,reference,created_by)
  values(p_item_id,p_type,p_change,v_before,v_after,p_reason,p_reference,auth.uid());
  return v_after;
end $$;
grant execute on function public.inventory_adjust_stock(uuid,numeric,text,text,text) to authenticated;
