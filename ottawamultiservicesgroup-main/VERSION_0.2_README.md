# Ottawa Multiservices Group CRM — Version 0.2

## Added
- Customer list, search, creation and customer profile.
- Formal estimates separated from public quote requests.
- Estimate creation with multiple line items and automatic 13% HST calculation.
- Estimate detail and status management.
- Customer history showing quote requests and formal estimates.
- Active admin helper and working logout.
- Supabase migration for estimates and estimate items with RLS.

## Required setup
1. Back up the Supabase database.
2. Open Supabase SQL Editor.
3. Run `supabase/migrations/202607300001_crm_v02.sql`.
4. Verify that your existing `admin_users`, `customers`, and `service_requests` tables exist.
5. Run `npm install`, then `npm run build`.

## Not included yet
PDF generation, email delivery, online customer acceptance, jobs, scheduling, invoices and payments are planned for later versions.
