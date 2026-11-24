# Professional onboarding database

This first stage introduces independent professional accounts and a review queue.
It does not change the existing CRM customer, partner, invoice or payment flows.
No live database change is made by building the app or running the tests below.

## Migration and rollout

The new migration is `supabase/migrations/20261123041042_professional_onboarding.sql`,
created with the Supabase CLI. It adds:

- `professional_accounts`: one dossier per confirmed Auth user, with owner/admin reads.
- `professional_documents`: private evidence metadata, with owner/admin reads.
- `professional_review_events`: review decision history, readable by active admins only.
- The private `professional-documents` Storage bucket: PDF, JPEG or PNG, at most
  8 MiB per file and ten stored objects per account, including unregistered uploads.
- Authenticated RPCs for editing, submission, document registration/removal and review.

The production migration history differs from the repository history. Compare it
before any rollout; do not blindly push every historical migration from this checkout.
Apply and verify this additive migration on a test database before rolling it out.
The new private schema `professional_private` must remain outside the Data API's
exposed schemas. The public tables and invoker RPCs carry explicit authenticated
grants; no public or anonymous professional API access is granted.

Once deployed, configure the test/production site's `/pro` URL in Supabase Auth's
allowed redirect URLs. Exercise email sign-in, draft save, private document upload,
submission, active-admin review, revision and resubmission against a test project.
Run Supabase security/performance advisors on that test database and inspect any
new finding before production rollout. Existing unrelated advisor findings need
their own assessment rather than blanket privilege changes.

## API contract

The public browser tables are read-only. Clients must use these RPCs for writes:

| RPC | Arguments | Result |
| --- | --- | --- |
| `save_my_professional_account` | `p_profile` JSON object | Account UUID |
| `submit_my_professional_account` | None | Void |
| `review_professional_account` | `p_account_id`, `p_decision`, `p_expected_updated_at`, `p_message` | Void |
| `register_my_professional_document` | `p_category`, `p_storage_path`, `p_file_name`, `p_mime_type`, `p_file_size` | Document UUID |
| `remove_my_professional_document` | `p_document_id` | Void |

Editable profile keys are `account_type`, `business_name`, `contact_name`, `phone`,
`city`, `province`, `postal_code`, `website`, `services`, `service_areas`, and
`preferred_language`. Unknown keys are rejected, including user IDs, email,
review status and reviewer fields. The account email is read from the currently
authenticated user's confirmed Auth email. Anonymous Auth users cannot create a dossier.

`province` uses a Canadian two-letter code. `website` accepts a blank string or
JSON null for no website, otherwise an HTTP(S) URL. `services` and `service_areas`
contain up to 30 nonempty labels, each at most 100 characters. Submission requires
a contact name, phone, city, province, Canadian postal code, service and coverage
area; companies also need a business name.

The submission action records a server timestamp in `attested_at`. The UI must
obtain the professional's accuracy/terms confirmation before invoking it. This
does not establish independent identity or credential verification.

Review decisions are `approved`, `changes_requested` or `suspended`. A nonempty
customer-visible message is required for every decision. The admin must pass the
account's exact `updated_at` string as `p_expected_updated_at`; stale decisions are
rejected with `professional_review_stale`. Approval requires `pending_review`.
An admin can reopen an approved or suspended dossier with `changes_requested`.
Professionals cannot reopen or approve their own dossier. Review messages should
describe the scope of OMSG's review, without claiming checks that were not performed.

## Documents

1. Save the professional account to obtain its UUID.
2. Upload with `upsert: false` to `professional-documents`, using the path
   `USER_UUID/ACCOUNT_UUID/RANDOM_UUID.pdf` (or `.jpg`, `.jpeg`, `.png`).
3. Register the uploaded object with `register_my_professional_document`.
4. If registration fails, attempt to remove the uploaded object and show any
   cleanup failure. Stored objects still count toward the ten-file limit.

Categories are `business_registration`, `insurance`, `trade_licence` and `other`.
The registration RPC checks the actual Storage object's path, MIME and size
metadata, ownership, account state and metadata uniqueness. Replaying a successful
registration returns the same UUID without changing the record.

To remove a document, remove its Storage object first, then call
`remove_my_professional_document`. A missing file prevents dossier submission
until its stale metadata is removed. File changes and draft edits are allowed only
in `draft` or `changes_requested`. Owners and active admins can read existing files;
active admins cannot rewrite the professional's evidence through these APIs.
Storage policies lock the owning account during file mutations, and submission
and review use the same row lock, so the state transition cannot race a file change.
Restrictive bucket fences prevent unrelated permissive Storage policies from
opening this bucket, and overwrite/upsert is denied.

## Isolated SQL tests

The test executes the complete migration unchanged in PostgreSQL WASM (PGlite),
using synthetic users and minimal Auth/Storage stand-ins. It reads no live data.
Install the test-only dependency outside the application checkout:

```bash
npm install --prefix /tmp/omsg-professional-db-test --no-save --no-package-lock @electric-sql/pglite@0.5.17
OMSG_PGLITE_MODULE=/tmp/omsg-professional-db-test/node_modules/@electric-sql/pglite/dist/index.js node scripts/test-professional-database.mjs
```

Coverage includes confirmed-email enforcement, owner isolation, inactive-admin
denial, direct-write/status-tampering denial, unsafe/oversized profile validation,
private evidence paths, malformed paths, MIME/size mismatch, document replay,
8 MiB limits, ten-object orphan-upload cap, evidence freezing, immutable review
history, stale-review detection and the revision/suspension lifecycle. Deliberately
broad legacy Storage policies confirm the new restrictive fences remain effective.

These tests exercise real PostgreSQL privileges, RLS, constraints and functions.
They do not exercise Supabase's HTTP Auth/Storage service, real email delivery,
file-content scanning, actual concurrent database connections, or live dashboard
configuration. The test database has no external identity/insurance/licence provider;
approval must not be advertised as an automated external verification.
