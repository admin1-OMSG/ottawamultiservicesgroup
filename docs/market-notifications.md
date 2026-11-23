# Marketplace notifications

Every targeted match, invitation, confirmed contact and message has an inbox entry. The dispatch job also sends a short notification to a verified contact channel when delivery is enabled. Its link opens the related request or conversation after sign-in. Messages, addresses and customer contact information stay out of notification text.

## Enable a test channel

Deploy `market-dispatch` with the per-function configuration in `supabase/config.toml` and apply the marketplace and dispatch migrations. Set these secrets in the **preview Supabase branch**.

| Setting | Value |
| --- | --- |
| `MARKET_DISPATCH_ENV` | `preview` |
| `MARKET_PREVIEW_RECIPIENTS` | Comma-separated, exact test email addresses or E.164 phone numbers |
| Email | `MARKET_RESEND_API_KEY` and `MARKET_MAIL_FROM` (a verified sender email address) |
| SMS | `MARKET_TWILIO_ACCOUNT_SID`, `MARKET_TWILIO_AUTH_TOKEN` and `MARKET_TWILIO_FROM` (an SMS-capable E.164 number) |

Use credentials assigned to the preview. One configured channel is sufficient. After configuring the sender and test recipient, enable scheduled delivery on that same branch. These commands use the public project reference. Credentials remain in the Edge Function secrets.

```sql
create extension if not exists pg_cron;
insert into market_private.dispatch_config(project_ref) values ('vdeeevxpwjvztsoonuxx')
on conflict(singleton) do update set project_ref=excluded.project_ref;
select cron.schedule('omsg-market-notifications','* * * * *','select market_private.schedule_dispatch()');
```

An operator can POST to the worker’s `/readiness` route with a single-use dispatch ticket to check which channels are configured without claiming or sending any notifications. The scheduler contacts the worker only when notifications are due. To pause delivery, remove the configuration row and unschedule the job.

Production requires its own project, sender configuration, `MARKET_DISPATCH_ENV=production`, `MARKET_PRODUCTION_PROJECT_REF` matching that project, and the HTTPS OMSG customer site in `MARKET_SITE_ORIGIN`. The preview project accepts only preview mode. Production activation can also process existing undelivered inbox entries. Review their age and intended audience before turning it on.

## Delivery status

The dispatcher prefers a verified email when its channel is available. For a verified phone number it uses Twilio SMS. Provider acceptance records the handoff. For SMS, a signed Twilio terminal failure updates the internal record, and an ambiguous network result retains its reservation to avoid sending another SMS. If the callback never arrives, use Twilio's message logs to reconcile that reservation. Resend provides its own idempotency window for email retries via the notification ID. The inbox remains available while external delivery is pending.

Run the tests without external services:

```sh
node --test tests/marketplace/dispatch.test.ts tests/marketplace/dispatch-db.test.mjs
```
