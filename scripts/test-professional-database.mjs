// Runs actual migration SQL in an isolated PostgreSQL WASM instance. No network,
// production credentials, or customer data. See docs/professional-onboarding-database.md.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { PGlite } = await import(process.env.OMSG_PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
const migration = readFileSync(
  new URL("../supabase/migrations/20261123041042_professional_onboarding.sql", import.meta.url),
  "utf8",
);
const user = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const unverified = "33333333-3333-4333-8333-333333333333";
const admin = "44444444-4444-4444-8444-444444444444";
const inactiveAdmin = "55555555-5555-4555-8555-555555555555";
let passed = 0;

async function test(label, fn) {
  await fn();
  console.log(`PASS ${label}`);
  passed++;
}
async function query(sql, args = []) {
  return (await db.query(sql, args)).rows;
}
async function one(sql, args = []) {
  return (await query(sql, args))[0];
}
async function as(uid, fn, role = "authenticated") {
  await db.exec(`set role ${role}`);
  await query("select set_config('request.jwt.claim.sub', $1, false)", [uid || ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
async function denied(fn, expression) {
  await assert.rejects(fn, expression);
}
const profile = {
  account_type: "company",
  business_name: "Example Services",
  contact_name: "Test Professional",
  phone: "(613) 555-0100",
  city: "Ottawa",
  province: "ON",
  postal_code: "K1A 0B1",
  website: "https://example.test",
  services: ["Cleaning"],
  service_areas: ["Ottawa", "Gatineau"],
  preferred_language: "fr",
};
async function save(p = profile) {
  return (
    await one("select public.save_my_professional_account($1::jsonb) as id", [JSON.stringify(p)])
  ).id;
}
async function snapshot(id) {
  return await one("select * from public.professional_accounts where id=$1", [id]);
}
async function review(id, decision, expected, message = "Submitted information reviewed by OMSG.") {
  return await query("select public.review_professional_account($1,$2,$3,$4)", [
    id,
    decision,
    expected,
    message,
  ]);
}
async function upload(path, mime = "application/pdf", size = 100) {
  return await query(
    "insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3::jsonb) returning id",
    ["professional-documents", path, JSON.stringify({ mimetype: mime, size })],
  );
}
async function register(path, category = "insurance", mime = "application/pdf", size = 100) {
  return (
    await one("select public.register_my_professional_document($1,$2,$3,$4,$5) as id", [
      category,
      path,
      "insurance.pdf",
      mime,
      size,
    ])
  ).id;
}
function docPath(uid, accountId, sequence = "aaaaaaaa") {
  return `${uid}/${accountId}/${sequence}-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf`;
}

try {
  // Minimal stand-ins model Supabase Auth and Storage SQL access; the new
  // migration, RLS rules, checks and RPCs execute unchanged against PostgreSQL.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table public.admin_users(id uuid primary key references auth.users(id), is_active boolean not null);
    create schema storage;
    create table storage.buckets(id text primary key, name text not null, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text not null references storage.buckets(id), name text not null, metadata jsonb, unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant all on storage.objects to anon, authenticated;
    -- Deliberately broad legacy policy tests that the new restrictive boundaries
    -- cannot be bypassed by an unrelated permissive policy on another bucket.
    create policy legacy_storage_policy on storage.objects for all to anon, authenticated using(true) with check(true);
    insert into storage.buckets(id,name,public) values ('legacy-public','legacy-public',true);
  `);
  for (const [id, email, verified] of [
    [user, "pro@example.test", true],
    [other, "other@example.test", true],
    [unverified, "unverified@example.test", false],
    [admin, "admin@example.test", true],
    [inactiveAdmin, "inactive@example.test", true],
  ]) {
    await query("insert into auth.users(id,email,email_confirmed_at) values ($1,$2,$3)", [
      id,
      email,
      verified ? "2026-11-01T12:00:00Z" : null,
    ]);
  }
  await query("insert into public.admin_users(id,is_active) values($1,true),($2,false)", [
    admin,
    inactiveAdmin,
  ]);
  await db.exec(migration);

  await test("Migration enables RLS and exposes only invoker public RPCs", async () => {
    const tables = await query(
      "select relname,relrowsecurity from pg_class where relname in ('professional_accounts','professional_documents','professional_review_events')",
    );
    assert.equal(tables.length, 3);
    assert.ok(tables.every((row) => row.relrowsecurity));
    const exposed = await query(
      "select p.proname,p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%professional%'",
    );
    assert.equal(exposed.length, 5);
    assert.ok(exposed.every((row) => !row.prosecdef));
    const unpinned = await query(
      "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='professional_private' and (proconfig is null or not ('search_path=\"\"'=any(proconfig)))",
    );
    assert.equal(unpinned.length, 0);
    const bucket = await one("select * from storage.buckets where id='professional-documents'");
    assert.equal(bucket.public, false);
    assert.equal(Number(bucket.file_size_limit), 8388608);
    assert.deepEqual(bucket.allowed_mime_types, ["application/pdf", "image/jpeg", "image/png"]);
  });
  await test("Anonymous requests cannot save, submit, review or read professional data", async () => {
    await as(
      null,
      async () => {
        await denied(() => save(), /permission denied/);
        await denied(
          () => query("select * from public.professional_accounts"),
          /permission denied/,
        );
        await denied(
          () => query("select public.submit_my_professional_account()"),
          /permission denied/,
        );
        await denied(() => review(user, "approved", new Date()), /permission denied/);
      },
      "anon",
    );
  });
  await test("A real confirmed email is required, including when a JWT exists", async () => {
    await as(unverified, () => denied(() => save(), /professional_verified_email_required/));
    await as(null, () => denied(() => save(), /professional_auth_required/));
    await query("update auth.users set is_anonymous=true where id=$1", [other]);
    await as(other, () => denied(() => save(), /professional_verified_email_required/));
    await query("update auth.users set is_anonymous=false where id=$1", [other]);
  });

  let accountId, otherAccountId;
  await test("Owners can save/reload their account, with email from Auth only", async () => {
    accountId = await as(user, () => save());
    otherAccountId = await as(other, () => save({ ...profile, business_name: "Other business" }));
    await as(user, async () => {
      const rows = await query("select * from public.professional_accounts");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].id, accountId);
      assert.equal(rows[0].email, "pro@example.test");
      assert.equal(rows[0].review_status, "draft");
      assert.equal(await save({ ...profile, city: "Gatineau", province: "QC" }), accountId);
      assert.deepEqual(
        await query("select * from public.professional_accounts where id=$1", [otherAccountId]),
        [],
      );
      await denied(
        () => save({ ...profile, user_id: other }),
        /professional_profile_field_not_editable/,
      );
      await denied(
        () => save({ ...profile, email: "stolen@example.test" }),
        /professional_profile_field_not_editable/,
      );
      await denied(
        () => save({ ...profile, review_status: "approved" }),
        /professional_profile_field_not_editable/,
      );
      await save();
    });
  });
  await test("Direct account/document writes and forged approval bypasses are denied", async () => {
    await as(user, async () => {
      await denied(
        () =>
          query("update public.professional_accounts set review_status='approved' where id=$1", [
            accountId,
          ]),
        /permission denied/,
      );
      await denied(
        () => query("delete from public.professional_accounts where id=$1", [accountId]),
        /permission denied/,
      );
      await denied(
        () =>
          query(
            "insert into public.professional_accounts(user_id,email) values($1,'fake@example.test')",
            [user],
          ),
        /permission denied/,
      );
      await denied(
        () =>
          query(
            "insert into public.professional_documents(account_id,category,storage_path,file_name,mime_type,file_size) values($1,'other','x','x.pdf','application/pdf',100)",
            [accountId],
          ),
        /permission denied/,
      );
      await denied(() => review(accountId, "approved", new Date()), /professional_admin_required/);
    });
    await as(inactiveAdmin, () =>
      denied(() => review(accountId, "suspended", new Date()), /professional_admin_required/),
    );
  });
  await test("Server validation rejects unsafe/oversized fields and incomplete submissions", async () => {
    await as(user, async () => {
      await denied(() => save({ ...profile, website: "javascript:alert(1)" }), /check constraint/);
      await denied(() => save({ ...profile, services: [""] }), /professional_invalid_services/);
      await denied(() => save({ ...profile, services: [123] }), /professional_invalid_services/);
      await denied(
        () => save({ ...profile, services: Array(31).fill("Cleaning") }),
        /professional_invalid_services/,
      );
      await denied(() => save({ ...profile, business_name: "a".repeat(161) }), /check constraint/);
      await save({ ...profile, website: null });
      assert.equal((await snapshot(accountId)).website, "");
      await save({});
      await denied(
        () => query("select public.submit_my_professional_account()"),
        /professional_profile_incomplete/,
      );
      await save();
    });
  });

  const path = docPath(user, accountId);
  let documentId;
  await test("Private uploads use the exact owner/account path, even with permissive legacy policies", async () => {
    await as(user, async () => {
      await upload(path);
      await denied(() => upload(docPath(user, otherAccountId)), /row-level security/);
      await denied(() => upload(docPath(other, otherAccountId)), /row-level security/);
      await denied(() => upload(`${user}/${accountId}/../secret.pdf`), /row-level security/);
      await denied(() => upload(`${user}/${accountId}/not-a-uuid.pdf`), /row-level security/);
      await denied(() => upload(path.replace(".pdf", ".html")), /row-level security/);
    });
    await as(
      null,
      () => denied(() => upload(docPath(user, accountId, "eeeeeeee")), /row-level security/),
      "anon",
    );
  });
  await test("Documents must exist and match Storage MIME/size; registrations are replay-safe", async () => {
    await as(user, async () => {
      await denied(
        () => register(docPath(user, accountId, "eeeeeeee")),
        /professional_document_missing/,
      );
      await denied(
        () => register(path, "insurance", "application/pdf", 999),
        /professional_document_metadata_mismatch/,
      );
      await denied(
        () => register(path, "insurance", "image/png", 100),
        /professional_document_metadata_mismatch/,
      );
      await denied(() => register(path, "identity"), /check constraint/);
      documentId = await register(path);
      assert.equal(await register(path), documentId);
      assert.equal((await query("select * from public.professional_documents")).length, 1);
    });
    await as(other, async () => {
      assert.deepEqual(await query("select * from public.professional_documents"), []);
      assert.deepEqual(
        await query("select * from storage.objects where bucket_id='professional-documents'"),
        [],
      );
      await denied(() => register(path), /professional_document_not_editable/);
    });
  });
  await test("Document metadata rejects more than 8 MiB, zero bytes, and unsafe original filenames", async () => {
    const tooLargePath = docPath(other, otherAccountId, "eeeeeeee");
    const emptyPath = docPath(other, otherAccountId, "dddddddd");
    await as(other, async () => {
      // Storage's HTTP service normally enforces the bucket byte limit before
      // this point. Mock an invalid object to verify the DB rejects it too.
      await upload(tooLargePath, "application/pdf", 8388609);
      await denied(
        () => register(tooLargePath, "insurance", "application/pdf", 8388609),
        /check constraint/,
      );
      await upload(emptyPath, "application/pdf", 0);
      await denied(
        () => register(emptyPath, "insurance", "application/pdf", 0),
        /check constraint/,
      );
      await query("delete from storage.objects where name = any($1::text[])", [
        [tooLargePath, emptyPath],
      ]);
      await denied(
        () =>
          query("select public.register_my_professional_document($1,$2,$3,$4,$5)", [
            "insurance",
            path,
            "../evidence.pdf",
            "application/pdf",
            100,
          ]),
        /professional_document_not_editable/,
      );
    });
    await as(user, async () => {
      const unsafePath = docPath(user, accountId, "bbbbbbbb");
      await upload(unsafePath);
      await denied(
        () =>
          query("select public.register_my_professional_document($1,$2,$3,$4,$5)", [
            "insurance",
            unsafePath,
            "../evidence.pdf",
            "application/pdf",
            100,
          ]),
        /check constraint/,
      );
      await query("delete from storage.objects where name=$1", [unsafePath]);
    });
  });
  await test("Unregistered object uploads are capped at ten; deletion still works at the cap", async () => {
    await as(other, async () => {
      const paths = Array.from({ length: 11 }, (_, i) =>
        docPath(other, otherAccountId, i.toString(16).padStart(8, "0")),
      );
      for (const item of paths.slice(0, 10)) await upload(item);
      await denied(() => upload(paths[10]), /row-level security/);
      assert.equal(
        (await query("delete from storage.objects where name=$1 returning id", [paths[0]])).length,
        1,
      );
      await upload(paths[10]);
      await query(
        "delete from storage.objects where bucket_id='professional-documents' and name like $1",
        [`${other}/${otherAccountId}/%`],
      );
    });
  });
  await test("Submission records attestation and freezes profile and evidence mutations", async () => {
    await as(user, async () => {
      await query("select public.submit_my_professional_account()");
      const account = await snapshot(accountId);
      assert.equal(account.review_status, "pending_review");
      assert.ok(account.attested_at);
      assert.ok(account.submitted_at);
      await denied(() => save(), /professional_profile_locked/);
      await denied(
        () => query("select public.submit_my_professional_account()"),
        /professional_profile_locked/,
      );
      await denied(() => upload(docPath(user, accountId, "eeeeeeee")), /row-level security/);
      assert.equal(
        (await query("delete from storage.objects where name=$1 returning id", [path])).length,
        0,
      );
      assert.equal(
        (await query("update storage.objects set metadata='{}' where name=$1 returning id", [path]))
          .length,
        0,
      );
      await denied(
        () => query("select public.remove_my_professional_document($1)", [documentId]),
        /professional_document_not_editable/,
      );
    });
  });
  await test("Active admins review with notes and optimistic concurrency; stale reviewer is rejected", async () => {
    const before = await snapshot(accountId);
    await as(admin, async () => {
      assert.equal((await query("select id from public.professional_accounts")).length, 2);
      assert.equal((await query("select * from public.professional_documents")).length, 1);
      assert.equal((await query("select * from storage.objects where name=$1", [path])).length, 1);
      await denied(() => review(accountId, "approved", null), /professional_review_stale/);
      await denied(
        () => review(accountId, "approved", before.updated_at, ""),
        /professional_review_message_required/,
      );
      await review(accountId, "approved", before.updated_at);
      await denied(
        () => review(accountId, "changes_requested", before.updated_at, "Different reviewer."),
        /professional_review_stale/,
      );
      const events = await query("select * from public.professional_review_events");
      assert.equal(events.length, 1);
      assert.equal(events[0].from_status, "pending_review");
      assert.equal(events[0].to_status, "approved");
      await denied(
        () => query("delete from public.professional_review_events"),
        /permission denied/,
      );
      await denied(
        () => query("update public.professional_review_events set message='forged'"),
        /permission denied/,
      );
    });
    await as(user, async () => {
      assert.equal((await snapshot(accountId)).review_status, "approved");
      assert.deepEqual(await query("select * from public.professional_review_events"), []);
      await denied(() => save(), /professional_profile_locked/);
    });
  });
  await test("Admins can request revisions, owners resubmit, and suspension requires admin reopening", async () => {
    await as(admin, async () => {
      await review(
        accountId,
        "changes_requested",
        (await snapshot(accountId)).updated_at,
        "Please update the insurance document.",
      );
    });
    await as(user, async () => {
      await save({ ...profile, business_name: "Updated business" });
      assert.equal((await snapshot(accountId)).attested_at, null);
      await denied(
        () => query("select public.remove_my_professional_document($1)", [documentId]),
        /professional_remove_stored_file_first/,
      );
      assert.equal(
        (await query("delete from storage.objects where name=$1 returning id", [path])).length,
        1,
      );
      await query("select public.remove_my_professional_document($1)", [documentId]);
      assert.equal((await query("select * from public.professional_documents")).length, 0);
      await query("select public.submit_my_professional_account()");
    });
    await as(admin, async () => {
      await review(
        accountId,
        "suspended",
        (await snapshot(accountId)).updated_at,
        "Contact OMSG to resolve the dossier issue.",
      );
    });
    await as(user, async () => {
      await denied(() => save(), /professional_profile_locked/);
      await denied(() => upload(path), /row-level security/);
      await denied(
        () => query("select public.submit_my_professional_account()"),
        /professional_profile_locked/,
      );
    });
    await as(admin, async () => {
      await denied(
        async () => review(accountId, "approved", (await snapshot(accountId)).updated_at),
        /professional_invalid_review_transition/,
      );
      await review(
        accountId,
        "changes_requested",
        (await snapshot(accountId)).updated_at,
        "You may update and resubmit your dossier.",
      );
      assert.equal((await query("select * from public.professional_review_events")).length, 4);
    });
    await as(user, async () => {
      await save();
      await query("select public.submit_my_professional_account()");
    });
  });
  await test("Inactive admins cannot read another professional or review history", async () => {
    await as(inactiveAdmin, async () => {
      assert.deepEqual(await query("select * from public.professional_accounts"), []);
      assert.deepEqual(await query("select * from public.professional_review_events"), []);
      assert.deepEqual(
        await query("select * from storage.objects where bucket_id='professional-documents'"),
        [],
      );
    });
  });
  await test("Restrictive fences leave unrelated Storage buckets working", async () => {
    await as(other, async () => {
      await query(
        "insert into storage.objects(bucket_id,name) values('legacy-public','legacy-file.txt')",
      );
      assert.equal(
        (await query("select * from storage.objects where bucket_id='legacy-public'")).length,
        1,
      );
    });
  });
  console.log(
    `\n${passed} professional database tests passed (isolated PostgreSQL; no live database changes).`,
  );
} finally {
  await db.close();
}
