import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/contact-request.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { contactRequestArgs, saveContactRequest } = await import(
  "data:text/javascript;base64," + Buffer.from(javascript).toString("base64")
);
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const input = {
  name: "  Example Contact  ",
  email: " EXAMPLE@example.test ",
  phone: "6135550100",
  message: "A general question.\nPlease reply by email.",
};
let passed = 0;
async function test(name, callback) {
  await callback();
  passed++;
  console.log("PASS " + name);
}

await test("Preserves message, name, phone and source without fabricating a service or price", () => {
  const args = contactRequestArgs(input, "verified-token", id, "en");
  assert.equal(args.p_email, "example@example.test");
  assert.equal(args.p_token, "verified-token");
  const payload = args.p_payload;
  assert.equal(payload.first_name, "Example");
  assert.equal(payload.last_name, "Contact");
  assert.equal(payload.phone, input.phone);
  assert.equal(payload.description, input.message);
  assert.equal(payload.address_line, null);
  assert.equal(payload.province, "Not provided");
  assert.equal(payload.service_name, "Contact message");
  assert.equal(payload.questionnaire_answers.source, "contact_page");
  assert.equal(payload.questionnaire_answers.requestType, "contact_message");
  assert.equal(payload.questionnaire_answers["Message"], input.message);
  assert.equal(payload.questionnaire_answers["Marketing consent"], "Not requested");
  assert.doesNotMatch(JSON.stringify(payload), /estimated_price|House Cleaning|Office Cleaning/);
});
await test("French messages and optional phone are preserved", () => {
  const payload = contactRequestArgs(
    { ...input, name: "Élodie", phone: "", message: "Une question concernant Gatineau." },
    "token",
    id,
    "fr",
  ).p_payload;
  assert.equal(payload.first_name, "Élodie");
  assert.equal(payload.last_name, null);
  assert.equal(payload.phone, null);
  assert.equal(payload.service_name, "Message de contact");
  assert.equal(payload.preferred_language, "fr");
  assert.equal(payload.questionnaire_answers.preferredLanguage, "fr");
});
await test("Invalid or unverified input does not reach the backend", async () => {
  let calls = 0;
  const rpc = async () => {
    calls++;
    return { data: id, error: null };
  };
  for (const invalid of [
    { ...input, name: " " },
    { ...input, email: "invalid" },
    { ...input, message: " " },
    { ...input, message: "x".repeat(3001) },
  ]) {
    await assert.rejects(
      saveContactRequest(invalid, "token", id, "en", rpc),
      /INVALID_CONTACT_FIELDS/,
    );
  }
  await assert.rejects(saveContactRequest(input, "", id, "en", rpc), /EMAIL_NOT_VERIFIED/);
  assert.equal(calls, 0);
});
await test("Success requires the actual saved request UUID from the verified CRM RPC", async () => {
  let calls = 0;
  const result = await saveContactRequest(input, "token", id, "en", async (name, args) => {
    calls++;
    assert.equal(name, "submit_verified_quote_request");
    assert.equal(args.p_payload.id, id);
    return { data: id, error: null };
  });
  assert.equal(calls, 1);
  assert.equal(result, id);
});
await test("Backend rejection and connection failure never report success", async () => {
  const original = structuredClone(input);
  await assert.rejects(
    saveContactRequest(input, "token", id, "en", async () => ({
      data: null,
      error: new Error("EMAIL_NOT_VERIFIED"),
    })),
    /EMAIL_NOT_VERIFIED/,
  );
  await assert.rejects(
    saveContactRequest(input, "token", id, "en", async () => {
      throw new Error("Offline");
    }),
    /Offline/,
  );
  assert.deepEqual(input, original);
});
await test("Empty or mismatched success responses remain unconfirmed", async () => {
  for (const data of [null, undefined, {}, "different-record"]) {
    await assert.rejects(
      saveContactRequest(input, "token", id, "en", async () => ({ data, error: null })),
      /CONTACT_SAVE_NOT_CONFIRMED/,
    );
  }
});
console.log(`${passed} contact request checks passed; all backend calls were mocked.`);
