import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_PROFESSIONAL_PROFILE,
  MAX_PROFESSIONAL_DOCUMENT_BYTES,
  isProfessionalEditable,
  professionalDocumentPath,
  professionalProfilePayload,
  professionalStatusLabel,
  validateProfessionalDocument,
  validateProfessionalProfile,
} from "../src/features/professionals/model.ts";

const validProfile = {
  ...EMPTY_PROFESSIONAL_PROFILE,
  business_name: " Ottawa Services Inc. ",
  contact_name: "Alex Exemple",
  phone: "+1 (613) 555-0123",
  city: "Ottawa",
  postal_code: "k1a0b1",
  services: ["cleaning"],
  service_areas: "Ottawa, Gatineau",
};

test("a Canadian professional can submit a profile without a website", () => {
  assert.deepEqual(validateProfessionalProfile(validProfile), []);
  const payload = professionalProfilePayload(validProfile, "fr");
  assert.equal(payload.website, null);
  assert.equal(payload.postal_code, "K1A 0B1");
  assert.equal(payload.business_name, "Ottawa Services Inc.");
  assert.equal(payload.preferred_language, "fr");
});

test("independent professionals do not need a company name", () => {
  const profile = { ...validProfile, account_type: "individual", business_name: "" };
  assert.deepEqual(validateProfessionalProfile(profile), []);
  assert.equal(professionalProfilePayload(profile, "en").business_name, profile.contact_name);
});

test("submission catches missing coverage, unsupported postal codes and unsafe websites", () => {
  const invalid = validateProfessionalProfile({
    ...validProfile,
    phone: "123",
    postal_code: "D1A 0B1",
    website: "javascript:alert(1)",
    service_areas: " , ",
  });
  for (const field of ["phone", "postal_code", "website", "service_areas"])
    assert.ok(invalid.includes(field));
  assert.ok(
    validateProfessionalProfile({ ...validProfile, website: "https://" }).includes("website"),
  );
  assert.ok(
    validateProfessionalProfile({ ...validProfile, service_areas: "x".repeat(101) }).includes(
      "service_areas",
    ),
  );
});

test("only draft and requested corrections are editable", () => {
  for (const status of [undefined, "draft", "changes_requested"])
    assert.equal(isProfessionalEditable(status), true);
  for (const status of ["pending_review", "approved", "suspended"])
    assert.equal(isProfessionalEditable(status), false);
  assert.equal(professionalStatusLabel("approved", "fr"), "Dossier approuvé");
  assert.equal(professionalStatusLabel("approved", "en"), "Application approved");
});

test("profile normalization drops empty and duplicate coverage areas", () => {
  const payload = professionalProfilePayload(
    {
      ...validProfile,
      service_areas: " Ottawa, ,Gatineau, Ottawa ",
      services: ["cleaning", "cleaning"],
    },
    "en",
  );
  assert.deepEqual(payload.service_areas, ["Ottawa", "Gatineau"]);
  assert.deepEqual(payload.services, ["cleaning"]);
});

test("document selection rejects oversized, empty and misleading file types", () => {
  assert.equal(
    validateProfessionalDocument({
      name: "insurance.pdf",
      type: "application/pdf",
      size: MAX_PROFESSIONAL_DOCUMENT_BYTES,
    }),
    null,
  );
  assert.equal(
    validateProfessionalDocument({
      name: "insurance.pdf",
      type: "application/pdf",
      size: MAX_PROFESSIONAL_DOCUMENT_BYTES + 1,
    }),
    "size",
  );
  assert.equal(
    validateProfessionalDocument({ name: "insurance.pdf", type: "application/pdf", size: 0 }),
    "size",
  );
  assert.equal(
    validateProfessionalDocument({ name: "payload.html", type: "application/pdf", size: 100 }),
    "type",
  );
  assert.equal(
    validateProfessionalDocument({ name: "payload.pdf", type: "text/html", size: 100 }),
    "type",
  );
});

test("private object paths use owner, account and generated IDs rather than supplied filenames", () => {
  const user = "11111111-1111-1111-1111-111111111111";
  const account = "22222222-2222-2222-2222-222222222222";
  const object = "33333333-3333-3333-3333-333333333333";
  assert.equal(
    professionalDocumentPath(user, account, object, "my certificate.PDF"),
    `${user}/${account}/${object}.pdf`,
  );
  assert.throws(() => professionalDocumentPath("../other-user", account, object, "document.pdf"));
  assert.throws(() => professionalDocumentPath(user, account, object, "payload.svg"));
});
