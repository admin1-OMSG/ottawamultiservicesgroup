-- OMSG v1.1.1 - persist each customer's preferred communication language
alter table if exists public.service_requests
  add column if not exists preferred_language text not null default 'en' check (preferred_language in ('en','fr'));

alter table if exists public.customers
  add column if not exists preferred_language text not null default 'en' check (preferred_language in ('en','fr'));

create or replace function public.set_my_preferred_language(p_language text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_language not in ('en','fr') then raise exception 'Invalid language'; end if;
  update public.customers c
  set preferred_language = p_language, updated_at = now()
  where exists (select 1 from public.customer_accounts ca where ca.auth_user_id = auth.uid() and ca.customer_id = c.id);
end;
$$;

grant execute on function public.set_my_preferred_language(text) to authenticated;
