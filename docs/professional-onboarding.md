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
