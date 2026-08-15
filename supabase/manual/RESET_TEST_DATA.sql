-- Ottawa Multiservices Group CRM
-- MANUAL / DESTRUCTIVE SCRIPT
-- Purpose: remove test customer/workflow data before production launch.
-- This file is intentionally NOT in supabase/migrations and will never run with `supabase db push`.
--
-- PRESERVED:
--   admin users/auth configuration
--   app_settings / business_hours / schedule_blocks
--   employees
--   partners / partner applications
--   inventory
--   database structure and RLS policies
--
-- NOTE: Supabase Auth users created for test customer portal accounts are not deleted here.
-- Delete test Auth users manually in Supabase Authentication only after verifying they are test accounts.

begin;

delete from public.stripe_checkout_sessions;
delete from public.payments;
delete from public.invoice_items;
delete from public.invoices;

delete from public.job_photos;
delete from public.partner_job_assignments;
delete from public.schedule_change_log;
delete from public.jobs;

delete from public.estimate_signatures;
delete from public.estimate_bookings;
delete from public.estimate_items;
delete from public.service_contracts;
delete from public.estimates;

delete from public.service_request_photos;
delete from public.email_notifications;
delete from public.customer_accounts;

delete from public.service_requests;
delete from public.customers;

commit;

-- Optional verification after commit:
-- select count(*) as customers from public.customers;
-- select count(*) as service_requests from public.service_requests;
-- select count(*) as estimates from public.estimates;
-- select count(*) as jobs from public.jobs;
-- select count(*) as invoices from public.invoices;
-- select count(*) as payments from public.payments;
