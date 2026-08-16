-- CRM v1.8 - richer partner network and subcontracting opportunities
alter table public.partner_applications
  add column if not exists application_type text not null default 'service_provider',
  add column if not exists applicant_type text,
  add column if not exists city text,
  add column if not exists project_location text,
  add column if not exists frequency text,
  add column if not exists desired_rate numeric(12,2),
  add column if not exists estimated_contract_value numeric(14,2),
  add column if not exists start_date date,
  add column if not exists details text;

alter table public.partner_applications drop constraint if exists partner_applications_application_type_check;
alter table public.partner_applications add constraint partner_applications_application_type_check
  check (application_type in ('service_provider','subcontracting_client'));

create index if not exists partner_applications_application_type_idx
  on public.partner_applications(application_type);
