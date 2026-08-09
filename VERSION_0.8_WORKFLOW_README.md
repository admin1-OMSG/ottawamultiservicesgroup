# Ottawa Multiservices Group — v0.8.1 Workflow & Scheduling

# Ottawa Multiservices Group CRM — Version 0.8 Workflow & Scheduling

This package is rebuilt from the latest GitHub ZIP supplied on August 9, 2026.

## Included changes

- Quote funnel now supports true multi-select questions and saves arrays in `service_requests.questionnaire_answers`.
- Admin quote request detail already renders arrays; the quote-request email now includes the full questionnaire.
- Official estimates now store:
  - estimated on-site duration,
  - crew size,
  - estimated labour-hours derived in the UI,
  - send timestamp.
- Estimate detail now has a dedicated **Envoyer le devis** button. Sending also updates the originating service request to `quote_sent`.
- Estimate email includes amount, estimated duration and a direct secure Supabase authentication link to the exact portal estimate, avoiding a second email-login step in the normal flow.
- Electronic-signature consent now states that signature + appointment reservation is an engagement to proceed and pay according to the accepted quote and expressly authorized extra work.
- After signing, the customer can select an available appointment slot.
- Available slots are calculated from:
  - business hours,
  - existing jobs,
  - customer reservations,
  - administrator schedule blocks,
  - the estimate's required duration.
- Admin calendar shows jobs, customer reservations and blocked periods.
- Admin can block unavailable periods directly from the calendar.
- Converting an accepted estimate to a job automatically reuses the customer's reserved start/end time and marks the reservation converted.
- Booking confirmation email is sent to the customer.

## New migration

`supabase/migrations/202608090001_crm_v08_workflow_scheduling.sql`

## New Edge Function

`supabase/functions/get-available-slots/index.ts`

## Updated Edge Functions

- `send-crm-email`
- `sign-estimate`

## Deployment order

1. Copy this package over the current project (keep `.git` and local `.env` files).
2. Run `npx supabase db push`.
3. Deploy:
   - `npx supabase functions deploy send-crm-email --no-verify-jwt`
   - `npx supabase functions deploy sign-estimate`
   - `npx supabase functions deploy get-available-slots`
4. Run `npm run build` locally.
5. Test the complete flow before pushing production.

## Required manual tests

1. Submit a quote request containing more than one choice in a multi-select question.
2. Confirm every selected option appears in Admin > Quote Requests.
3. Create an official estimate from the request.
4. Enter duration and crew size.
5. Use **Envoyer le devis**.
6. Click the email button and confirm it opens the portal without requesting a second email under normal conditions.
7. Sign the quote.
8. Select a free appointment slot.
9. Confirm the slot appears in the admin calendar.
10. Convert the estimate into a job and confirm the reserved time is reused.
11. Complete the job and create the invoice using the existing invoice workflow.

## Note

Online payment is intentionally not required by this workflow. The customer is informed that the signed quote and reserved appointment represent a commitment to proceed and pay according to the agreed terms. Have your final contract wording reviewed by an Ontario legal professional before relying on it in production.


## v0.8.1 — ordre du parcours client

Le client choisit désormais son créneau **avant** la signature électronique :

1. consulter le devis;
2. choisir une date et un créneau disponible;
3. vérifier le créneau choisi;
4. signer et accepter le devis;
5. la signature, l’acceptation et la réservation sont enregistrées ensemble;
6. le créneau apparaît dans le calendrier administrateur.

Le créneau n’est confirmé définitivement qu’au moment où la signature est enregistrée.
