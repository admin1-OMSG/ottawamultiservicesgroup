# Ottawa Multiservices CRM — Version 0.5

## Customer Portal

Version 0.5 activates the existing `/portal` page as a secure customer portal.

### Features
- Passwordless email magic-link authentication
- Automatic matching with an existing CRM customer by email
- Customer dashboard
- View estimates and accept or reject eligible estimates
- View invoices, balances and payment status
- View scheduled and completed jobs
- Row Level Security so customers only see their own records

## Required Supabase step
Run `supabase/migrations/202607300004_crm_v05.sql` in the Supabase SQL Editor.

In Supabase Authentication > URL Configuration, add these redirect URLs:
- `http://localhost:5173/portal`
- `https://www.ottawamultiservicesgroup.com/portal`

The customer's Supabase Auth email must exactly match the email saved in the CRM customer record.

## Test
1. Open `/portal`.
2. Enter the email of an existing CRM customer.
3. Open the magic link received by email.
4. Confirm that only that customer's estimates, invoices and jobs appear.
5. Test accepting a sent estimate.
