import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function testMarketplaceBadges({
  rows,
  value,
  auth,
  as,
  client,
  phoneClient,
  far,
  farId,
  request,
  byPhone,
}) {
  const readLead = (id) => rows("select * from public.market_requests_v2() where id=$1", [id]);
  const append = (requestId, editId, details) =>
    rows("select public.market_add_request_details($1,$2,$3)", [requestId, editId, details]);
  const fourth = randomUUID();
  const publish = () =>
    value(
      "select public.market_create_request($1,'cleaning','Ottawa','Kitchen','Clean the counters','asap','{}')",
      [fourth],
    );

  // This client has published one completed and two withdrawn requests before the migration.
  await auth(client, async () => {
    assert.equal((await rows("select * from public.market_requests_v2()")).length, 3);
    const [original] = await readLead(request);
    assert.equal(original.repeat_client, false);
    assert.equal(original.details_updated_at, null);
    assert.equal(original.phone_verified, false);
    assert.equal(original.email_verified, true);
    await publish();
    await publish();
    assert.equal((await rows("select * from public.market_requests_v2()")).length, 4);
    assert.equal((await readLead(request))[0].repeat_client, true);
  });
  const edit = randomUUID();
  await as("anon", null, () =>
    assert.rejects(append(fourth, edit, "New detail"), /permission denied/),
  );
  await auth(phoneClient, async () => {
    assert.deepEqual(await readLead(fourth), []);
    assert.equal((await readLead(byPhone))[0].repeat_client, false);
    await assert.rejects(append(fourth, edit, "New detail"), /market_request_unavailable/);
  });
  await auth(far, async () => {
    const [lead] = await readLead(fourth);
    assert.equal(lead.urgency, "asap");
    assert.equal(lead.repeat_client, true);
    assert.equal(lead.details_updated_at, null);
    assert.equal(lead.phone_verified, false);
    assert.equal((await readLead(byPhone))[0].phone_verified, true);
    assert.ok(!("phone" in lead || "client_phone" in lead || "client_id" in lead));
    await assert.rejects(append(fourth, edit, "New detail"), /market_request_unavailable/);
  });
  const firstAddition = "Please clean the oven.";
  const secondAddition = "Bring a step ladder.";
  await auth(client, async () => {
    await assert.rejects(rows("select * from market_private.request_details"), /permission denied/);
    await assert.rejects(append(fourth, edit, "Clean the counters"), /market_duplicate_details/);
    for (const invalid of [null, "   ", "\t\n", "a".repeat(2001)]) {
      await assert.rejects(append(fourth, edit, invalid), /market_invalid_details/);
    }
    assert.equal((await readLead(fourth))[0].details_updated_at, null);
    await append(fourth, edit, "  " + firstAddition + "  ");
    const originalTimestamp = (await readLead(fourth))[0].details_updated_at;
    assert.ok(originalTimestamp);
    await append(fourth, edit, firstAddition);
    assert.deepEqual((await readLead(fourth))[0].details_updated_at, originalTimestamp);
    await assert.rejects(append(fourth, edit, "A different edit"), /market_invalid_details/);
    await assert.rejects(append(fourth, randomUUID(), firstAddition), /market_duplicate_details/);
    await append(fourth, randomUUID(), secondAddition);
  });
  await auth(far, async () => {
    const [lead] = await readLead(fourth);
    assert.equal(
      lead.description,
      ["Clean the counters", firstAddition, secondAddition].join("\n\n"),
    );
    assert.ok(lead.details_updated_at);
  });
  await auth(client, async () => {
    await rows("select public.market_withdraw($1)", [fourth]);
    await append(fourth, edit, firstAddition);
    await assert.rejects(
      append(fourth, randomUUID(), "New edit after closing"),
      /market_request_closed/,
    );
    assert.equal((await readLead(fourth))[0].repeat_client, true);
  });
  await auth(far, async () => assert.deepEqual(await readLead(fourth), []));

  async function checkProviderBadges(subscribed, phoneVerified) {
    const provider = await auth(
      client,
      async () => (await rows("select * from public.market_directory_v2() where id=$1", [farId]))[0],
    );
    assert.deepEqual(
      [provider.paid_subscriber, provider.phone_verified],
      [subscribed, phoneVerified],
    );
    assert.ok(!("phone" in provider || "stripe_subscription" in provider));
    const wallet = await auth(far, () => value("select public.market_wallet_v2()"));
    assert.deepEqual([wallet.paid_subscriber, wallet.phone_verified], [subscribed, phoneVerified]);
    const thread = await auth(
      client,
      async () =>
        (
          await rows(
            "select * from public.market_my_contacts_v2() where request_id=$1 and provider_id=$2",
            [request, farId],
          )
        )[0],
    );
    assert.deepEqual(
      [thread.provider_paid_subscriber, thread.provider_phone_verified],
      [subscribed, phoneVerified],
    );
  }
  const service = (fn) => as("service_role", null, fn);
  const buy = (code) =>
    service(() =>
      value("select public.market_checkout_begin($1,$2,$3,null)", [far, code, randomUUID()]),
    );
  await rows(
    "update market_billing.offers set credits=110,price_cents=10400,enabled=true where code in ('pack104','monthly')",
  );
  await rows("update public.professional_accounts set phone='613 555 0122' where id=$1", [farId]);
  await rows("update auth.users set phone='+16135550122' where id=$1", [far]);
  await checkProviderBadges(false, false);
  await rows("update auth.users set phone_confirmed_at=now() where id=$1", [far]);
  await rows("update public.professional_accounts set phone='613 555 0100' where id=$1", [farId]);
  await checkProviderBadges(false, false);
  await rows("update public.professional_accounts set phone='(613) 555-0122' where id=$1", [farId]);
  const pack = await buy("pack104");
  await service(() =>
    value("select public.market_payment_credit($1,'cs_badge_pack',$2,'cad','cus_badges',null)", [
      pack.id,
      pack.price_cents,
    ]),
  );
  await checkProviderBadges(false, true);
  const monthly = await buy("monthly");
  const changeState = (status, timestamp) =>
    service(() =>
      value("select public.market_subscription_state($1,'sub_badge','cus_badges',$2,$3)", [
        monthly.id,
        status,
        timestamp,
      ]),
    );
  await changeState("active", 100);
  await checkProviderBadges(false, true);
  await service(() =>
    value("select public.market_payment_credit($1,'in_badge',$2,'cad','cus_badges','sub_badge')", [
      monthly.id,
      monthly.price_cents,
    ]),
  );
  await checkProviderBadges(true, true);
  await changeState("canceled", 200);
  await rows("update auth.users set phone=null where id=$1", [far]);
  await checkProviderBadges(false, false);
}
