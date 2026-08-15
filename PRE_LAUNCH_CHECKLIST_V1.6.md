# Ottawa Multiservices Group CRM — v1.6 Pre‑Launch Checklist

This checklist is for the final test before real customer use.

## 1. Build and technical audit
- Run `npm.cmd run build`.
- Run `npm.cmd run audit:launch`.
- Confirm Vercel production deployment is **Ready**.
- Confirm Supabase migrations show **Remote database is up to date**.

## 2. Public website
- Test desktop, tablet and mobile widths.
- Test EN and FR navigation.
- Submit one EN quote request and one FR quote request.
- Upload request photos in both tests.
- Confirm phone and public email are correct.

## 3. Quote → booking → signature
- Confirm the admin sees every submitted field and photo.
- Create a quote with estimated hours and payment terms.
- Send it to the customer.
- Confirm the email language matches the customer's preferred language.
- Confirm the customer can select an available time before signing.
- Confirm the customer and admin can later reschedule.
- Confirm manually blocked calendar periods cannot be booked.

## 4. Job → photos → invoice
- Convert an accepted quote to a job.
- Add after-work photos.
- Create the invoice.
- Verify subtotal, HST, total, payment method, paid amount and balance.
- Verify after-work photos appear in the customer portal.
- Download and inspect the PDF.

## 5. Payments
- Record a cash payment.
- Record an Interac payment.
- Confirm Partial Paid / Paid status updates.
- If Stripe is enabled, complete one low-value Stripe test-mode transaction.
- Confirm customer receipt/invoice email is sent in EN or FR as appropriate.

## 6. Admin modules
- Customers
- Quote Requests
- Quotes
- Contracts
- Jobs
- Schedule
- Employees
- Invoices
- Payments
- Reports
- Settings
- Partners
- Inventory

## 7. Email tests
Test at least:
- quote sent
- quote accepted/signed
- appointment/reschedule notification
- invoice sent
- payment confirmation
- partner application confirmation

Verify subject, body and CTA buttons in both EN and FR where applicable.

## 8. Test-data cleanup
A manual script is included at:

`supabase/manual/RESET_TEST_DATA.sql`

Review it before running. It is intentionally outside `supabase/migrations`, so `npx supabase db push` will never execute it automatically.

Before running it:
1. Export anything you want to keep.
2. Confirm all customer/workflow records are test data.
3. Run it manually in Supabase SQL Editor.
4. Review Supabase Authentication and manually remove only test customer Auth users.

## 9. Go-live
- Confirm business phone, public email, GST/HST number and address in Settings.
- Confirm business hours and scheduling availability.
- Confirm quote validity period and tax rate.
- Confirm privacy policy and terms are current.
- Confirm backups/export plan.
- Submit one final end-to-end test after production deployment.
