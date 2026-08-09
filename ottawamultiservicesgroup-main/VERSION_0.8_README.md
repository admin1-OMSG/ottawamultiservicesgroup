# Ottawa Multiservices Group CRM — Version 0.8

## Workflow & scheduling sprint

- Multiple-choice questionnaire answers are stored as arrays and displayed in admin.
- Quote-request email includes the complete questionnaire JSON.
- Estimates include estimated on-site duration and crew size.
- Dedicated Send Quote action validates duration and sends the customer email.
- Quote email attempts to generate a Supabase one-click magic link that opens the portal directly.
- After electronic signature, the customer can select a free appointment slot.
- Availability is calculated from business hours, calendar blocks, existing scheduled jobs, existing reservations, and estimate duration.
- Reserved customer slots appear in the admin calendar and preload when converting the estimate to a job.
- Signature consent explicitly states that signing and booking are a commitment to proceed and pay under the agreed invoice terms.

## Deploy

1. `npx supabase db push`
2. `npx supabase functions deploy send-crm-email`
3. `npx supabase functions deploy sign-estimate`
4. `npm install`
5. `npm run build`
6. `git add . && git commit -m "feat: CRM v0.8 workflow and scheduling" && git push origin main`

## Important

Test in Sandbox/staging first. The one-click quote email relies on Supabase Auth redirect URLs allowing your production `/portal` URL.
