# Professional onboarding

Professionals can create an account at `/pro`, save their service profile, upload
private supporting documents and submit their dossier. Active OMSG administrators
review those dossiers at `/admin/professionals`, with a message shown to the
professional. A request for changes reopens editing and allows resubmission.

The interface supports English and French. Professional profiles are separate
from the existing CRM partner applications. No existing partner record is claimed
automatically by matching an email address.

## Validation

Run `npm ci`, then `npm run test:professionals`. These checks run without production
credentials or customer records. The database checks execute the migration against
isolated PostgreSQL/PGlite; the interface checks use mocked Auth/REST/Storage APIs.

To verify a production-shaped build locally, set test values for the two existing
browser Supabase environment variables and run `npm run build`. Never use a
Supabase service-role key in browser configuration.

For the schema, document access rules and rollout steps, see
[professional-onboarding-database.md](professional-onboarding-database.md).
Real email delivery, allowed sign-in redirects, Storage HTTP requests and a complete
professional/admin round trip must be checked in a dedicated test environment
before enabling public registrations.

The OMSG preview uses an isolated Supabase branch without production data. The
legacy CRM migration history cannot rebuild the whole CRM on an empty database.
For this test only, [the staging fixture](../tests/fixtures/professional-staging-prerequisites.sql)
supplies the admin membership table that the professional module expects.
It creates no administrators. Never merge this Supabase test branch into
production or apply its fixture to the live CRM.

For the email sign-in test, open the stable Vercel branch alias and allow the
exact same origin followed by `/pro` in **Authentication → URL Configuration**
on the Supabase **test branch**. Use a test mailbox that the configured mailer
can deliver to. A page that loads successfully does not prove that the email
was delivered or that its link returns the professional to the preview.

If the request for the email fails, inspect the test branch's **Auth logs** at
the time of the attempt. For example, a failure on `POST /auth/v1/otp` with
HTTP 500 and an Auth log reporting SMTP `535 Authentication credentials invalid`
means the sending mail server rejected Supabase's credentials. Check the
branch's SMTP settings before asking the professional to try again. Changing the
recipient's password, the redirect URL, or the professional tables does not fix
SMTP authentication. Keep SMTP credentials, one-time codes and sign-in links
out of logs and support messages.

The preview also upgrades TanStack Start to `1.169.7` and aligns its Router
packages. The resolved `@tanstack/start-server-core` is `1.169.45`, above the
`1.169.39` minimum for [CVE-2026-102989](https://tanstack.com/blog/tanstack-start-security-update-cve-2026-102989).
Deploying the updated build is required to patch an existing deployment. The
upgrade does not change the Supabase account/session model. Its SSR response
handling must be smoke-tested on Vercel as well as compiled locally.

## Scope

This is the professional onboarding stage, not the complete marketplace. It does
not collect payments for client services. Professional credit purchases,
subscriptions, paid contact unlocks and private client/professional messaging are
subsequent stages.

“Application approved” means that OMSG reviewed the submitted information.
It is not an identity or criminal-record verification badge. Bark's Canadian help
pages distinguish ordinary professional registration from the additional
[Bark Verified checks](https://help.bark.com/hc/en-ca/articles/17035153606044-Are-professionals-verified-on-Bark).
Those external checks require their own provider integration before OMSG can
truthfully display an equivalent verification result. No photo ID is requested by
this first stage.
