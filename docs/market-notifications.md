# Marketplace notifications

Every targeted match, invitation, confirmed contact and message has an inbox entry. The dispatch job also sends a short notification to a verified contact channel when delivery is enabled. Its link opens the related request or conversation after sign-in. Messages, addresses and customer contact information stay out of notification text.

## Enable a test channel

Deploy `market-dispatch` with the per-function configuration in `supabase/config.toml` and apply the marketplace migrations on the preview branch.

For an email-only test, an operator can provision one authorized recipient and sender on the pinned preview project. The sender must belong to a domain verified with Resend. These are example addresses.

```sql
insert into market_private.preview_mail_settings(recipient, sender)
values ('owner@example.org', 'notifications@example.org')
on conflict (singleton) do update
set recipient = excluded.recipient, sender = excluded.sender;
```

The worker uses `MARKET_RESEND_API_KEY` from the preview's Edge Function secrets. On that project it can also use the existing CRM's `RESEND_API_KEY` when the marketplace key is absent. The authenticated readiness check reports whether the worker has a key, sender and recipient configured. Delivery and domain verification must still be confirmed with Resend.

For an explicit test recipient list or SMS delivery, use Edge Function secrets on the preview branch.

| Setting | Value |
| --- | --- |
| `MARKET_DISPATCH_ENV` | `preview` |
| `MARKET_PREVIEW_RECIPIENTS` | Exact test email addresses or E.164 phone numbers, separated by commas |
| Email | `MARKET_RESEND_API_KEY` and `MARKET_MAIL_FROM` (a verified sender address) |
| SMS | `MARKET_TWILIO_ACCOUNT_SID`, `MARKET_TWILIO_AUTH_TOKEN` and `MARKET_TWILIO_FROM` (an SMS-capable E.164 number) |

An explicit recipient list takes precedence over the database setting. The database setting allows email delivery to its single configured recipient. Production uses the dedicated marketplace credentials.

Use credentials assigned to the preview. One configured channel is sufficient. After configuring the sender and test recipient, enable scheduled delivery on that same branch. These commands use the public project reference. Credentials remain in the Edge Function secrets.

```sql
create extension if not exists pg_cron;
insert into market_private.dispatch_config(project_ref) values ('vdeeevxpwjvztsoonuxx')
on conflict(singleton) do update set project_ref=excluded.project_ref;
select cron.schedule('omsg-market-notifications','* * * * *','select market_private.schedule_dispatch()');
```

An operator can POST to the worker’s `/readiness` route with a single-use dispatch ticket to check which channels are configured without claiming or sending any notifications. The scheduler contacts the worker only when notifications are due. To pause delivery, remove the configuration row and unschedule the job.

Production requires its own project, sender configuration, `MARKET_DISPATCH_ENV=production`, `MARKET_PRODUCTION_PROJECT_REF` matching that project, and the HTTPS OMSG customer site in `MARKET_SITE_ORIGIN`. The preview project can deliver only to configured test recipients. Production activation can also process existing undelivered inbox entries. Review their age and intended audience before turning it on.

## Delivery status

The dispatcher prefers a verified email when its channel is available. For a verified phone number it uses Twilio SMS. Provider acceptance records the handoff. For SMS, a signed Twilio terminal failure updates the internal record, and an ambiguous network result retains its reservation to avoid sending another SMS. If the callback never arrives, use Twilio's message logs to reconcile that reservation. Resend provides its own idempotency window for email retries via the notification ID. The inbox remains available while external delivery is pending.

Run the tests without external services:

```sh
node --test tests/marketplace/dispatch.test.ts tests/marketplace/dispatch-db.test.mjs
```
