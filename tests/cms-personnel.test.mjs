import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { PersonnelInvalid, createPersonnelCrypto, maskNationalId, validNationalId, validatePersonnel, validatePrivate } from "../lib/cms/personnel-registry.ts";

// 1-2345-67890-12-? : compute a valid check digit for the fixtures
const withCheck = (first12) => {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(first12[i]) * (13 - i);
  return `${first12}${(11 - (sum % 11)) % 10}`;
};
const NID = withCheck("123456789012");
const NID2 = withCheck("310100000001");

test("national id: checksum, masking", () => {
  assert.equal(validNationalId(NID), true);
  assert.equal(validNationalId(NID.slice(0, 12) + ((Number(NID[12]) + 1) % 10)), false);
  assert.equal(validNationalId("123"), false);
  assert.equal(validNationalId("12345678901a3"), false);
  assert.equal(maskNationalId(NID), `${NID[0]}-XXXX-XXXXX-XX-${NID[12]}`);
});

test("encryption: round trip, bound to the person, tamper-evident, no key -> unavailable", () => {
  const key = randomBytes(32).toString("base64");
  const c = createPersonnelCrypto(key);
  const blob = c.encrypt("RAE-PS-0001", { nationalId: NID, address: "somewhere" });
  assert.ok(blob.startsWith("v1:") && !blob.includes(NID), "ciphertext carries no plaintext");
  assert.deepEqual(c.decrypt("RAE-PS-0001", blob), { nationalId: NID, address: "somewhere" });
  assert.throws(() => c.decrypt("RAE-PS-0002", blob), "a blob cannot be moved to another person");
  const flipped = `v1:${Buffer.concat([Buffer.from(blob.slice(3), "base64").subarray(0, 40), Buffer.from([0]), Buffer.from(blob.slice(3), "base64").subarray(41)]).toString("base64")}`;
  assert.throws(() => c.decrypt("RAE-PS-0001", flipped), "tampering is detected");
  assert.throws(() => createPersonnelCrypto(randomBytes(32).toString("base64")).decrypt("RAE-PS-0001", blob), "another key cannot read it");
  assert.notEqual(c.encrypt("RAE-PS-0001", { a: 1 }), c.encrypt("RAE-PS-0001", { a: 1 }), "fresh IV every time");
  assert.equal(c.nationalIdHash(NID), c.nationalIdHash(NID));
  assert.notEqual(c.nationalIdHash(NID), createPersonnelCrypto(randomBytes(32).toString("base64")).nationalIdHash(NID), "the hash is keyed");
  assert.equal(createPersonnelCrypto(undefined), null);
  assert.equal(createPersonnelCrypto("c2hvcnQ="), null, "a short key is refused");
});

test("validation: required names/position, bounded fields, restricted fields", () => {
  const ok = { firstTh: "ก", lastTh: "ข", positionTh: "นักวิชาการ" };
  assert.equal(validatePersonnel(ok).isPublic, false);
  for (const bad of [{ firstTh: "" }, { email: "nope" }, { phoneOffice: "call me" }, { departmentCode: "x" }, { expertise: Array(11).fill("a") }, { status: "gone" }]) {
    assert.throws(() => validatePersonnel({ ...ok, ...bad }), PersonnelInvalid, JSON.stringify(bad));
  }
  assert.equal(validatePrivate({ nationalId: ` ${NID.slice(0, 1)}-${NID.slice(1, 5)}-${NID.slice(5, 10)}-${NID.slice(10, 12)}-${NID[12]} ` }).nationalId, NID, "dashes and spaces are accepted");
  for (const bad of [{ nationalId: "1234567890123" }, { birthDate: "2999-01-01" }, { gender: "x" }, { facebookUrl: "http://fb.example" }, { personalPhone: "abc" }, { education: Array(31).fill({}) }, { workHistory: [{ organization: "" }] }]) {
    assert.throws(() => validatePrivate(bad), PersonnelInvalid, JSON.stringify(bad));
  }
});

async function withServer(key, run) {
  resetRuntime();
  for (const [id, role] of [["officer", "officer"], ["editor", "editor"], ["publisher", "publisher"], ["admin", "admin"], ["viewer", "viewer"]]) addUser({ id, role, password: `${id}-password-1234` });
  const server = createCmsServer({ personnelKey: key });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const login = async (id) => (await (await fetch(`${url}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: id, password: `${id}-password-1234` }) })).json()).token;
  const call = (method, path, token, body) => fetch(`${url}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    const t = Object.fromEntries(await Promise.all(["officer", "editor", "publisher", "admin", "viewer"].map(async (id) => [id, await login(id)])));
    await run({ call, t });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const person = { firstTh: "สมชาย", lastTh: "ใจดี", positionTh: "ผู้อำนวยการ", firstEn: "Somchai", lastEn: "Jaidee", positionEn: "Director", email: "somchai@example.org", phoneOffice: "053-875-000", expertise: ["research"] };
const KEY = randomBytes(32).toString("base64");

test("RBAC and public/private separation end to end", async () => {
  await withServer(KEY, async ({ call, t }) => {
    assert.equal((await call("GET", "/v1/personnel", null)).status, 401);
    for (const who of ["officer", "viewer"]) assert.equal((await call("POST", "/v1/personnel", t[who], person)).status, 403, `${who} cannot manage personnel`);
    const created = await (await call("POST", "/v1/personnel", t.editor, person)).json();
    assert.equal(created.code, "RAE-PS-0001");
    assert.equal(created.isPublic, false);
    assert.equal((await call("POST", "/v1/personnel", t.editor, { ...person, isPublic: true, consent: true })).status, 403, "an editor cannot publish a person");
    assert.equal((await call("POST", "/v1/personnel", t.publisher, { ...person, firstTh: "x", isPublic: true })).status, 400, "publishing without consent is refused");
    const pub = async () => (await (await call("GET", "/v1/public/personnel")).json()).personnel;
    assert.deepEqual(await pub(), [], "a draft person is not public");

    // restricted data: admin only
    for (const who of ["editor", "publisher", "officer"]) assert.ok([403].includes((await call("GET", `/v1/personnel/${created.code}/private`, t[who])).status), `${who} cannot read private data`);
    assert.equal((await call("PATCH", `/v1/personnel/${created.code}/private`, t.publisher, { nationalId: NID })).status, 403);
    const saved = await call("PATCH", `/v1/personnel/${created.code}/private`, t.admin, { nationalId: NID, birthDate: "1980-05-01", gender: "male", address: "1 Road", personalPhone: "081-000-0000", education: [{ level: "PhD", degree: "D.Sc.", major: "x", institution: "y", year: "2010" }] });
    assert.equal(saved.status, 200);
    const priv = await (await call("GET", `/v1/personnel/${created.code}/private`, t.admin)).json();
    assert.equal(priv.data.nationalId, maskNationalId(NID), "the id is masked unless revealed");
    assert.equal(priv.data.address, "1 Road");
    assert.equal((await (await call("GET", `/v1/personnel/${created.code}/private?reveal=nationalId`, t.admin)).json()).data.nationalId, NID);
    const second = await (await call("POST", "/v1/personnel", t.editor, { ...person, firstTh: "สอง" })).json();
    assert.equal((await call("PATCH", `/v1/personnel/${second.code}/private`, t.admin, { nationalId: NID })).status, 400, "the same national id cannot belong to two people");
    assert.equal((await call("PATCH", `/v1/personnel/${second.code}/private`, t.admin, { nationalId: NID2 })).status, 200);
    assert.equal((await call("PATCH", `/v1/personnel/${created.code}/private`, t.admin, { nationalId: "1234567890123" })).status, 400, "bad checksum");

    // publish with consent
    assert.equal((await call("PATCH", `/v1/personnel/${created.code}`, t.publisher, { isPublic: true })).status, 400, "no consent flag");
    assert.equal((await call("PATCH", `/v1/personnel/${created.code}`, t.publisher, { isPublic: true, consent: true })).status, 200);
    const [shown] = await pub();
    assert.equal(shown.firstTh, "สมชาย");
    const blob = JSON.stringify(shown);
    for (const secret of ["employeeCode", "consentAt", "consentBy", "createdBy", "nationalId", "birthDate", "address", "personalPhone", "source", "status", "isPublic"]) assert.ok(!blob.includes(`"${secret}"`), `public view leaks ${secret}`);
    assert.ok(!blob.includes(NID) && !blob.includes("1 Road"));

    // nothing restricted in the list/one endpoints either
    const listBlob = JSON.stringify(await (await call("GET", "/v1/personnel", t.editor)).json()) + JSON.stringify(await (await call("GET", `/v1/personnel/${created.code}`, t.editor)).json());
    assert.ok(!listBlob.includes(NID) && !listBlob.includes("1 Road") && !listBlob.includes("1980-05-01"));

    // inactive people disappear from the public list
    assert.equal((await call("PATCH", `/v1/personnel/${created.code}`, t.publisher, { status: "inactive" })).status, 200);
    assert.deepEqual(await pub(), []);
    assert.equal((await call("GET", "/v1/public/openapi.json")).status, 200);
  });
});

test("audit: private reads and writes are recorded without their content; no national id anywhere in audit rows", async () => {
  await withServer(KEY, async ({ call, t }) => {
    const p = await (await call("POST", "/v1/personnel", t.editor, person)).json();
    await call("PATCH", `/v1/personnel/${p.code}/private`, t.admin, { nationalId: NID, address: "secret road 9" });
    await call("GET", `/v1/personnel/${p.code}/private`, t.admin);
    await call("GET", `/v1/personnel/${p.code}/private?reveal=nationalId`, t.admin);
    await call("PATCH", `/v1/personnel/${p.code}`, t.editor, { positionTh: "รองผู้อำนวยการ" });
    const dash = await (await call("GET", "/v1/dashboard", t.admin)).json();
    const actions = dash.recent.map((r) => r.action);
    for (const a of ["personnel.create", "personnel.private.write", "personnel.private.read", "personnel.private.reveal", "personnel.update"]) assert.ok(actions.includes(a), `audited: ${a}`);
    const { listAuditForTests } = await import("../cms-runtime/server.mjs").then((m) => ({ listAuditForTests: m.memoryRepository().listAudit }));
    const rows = JSON.stringify(await listAuditForTests());
    assert.ok(!rows.includes(NID) && !rows.includes("secret road") && !rows.includes("รองผู้อำนวยการ"), "audit rows carry field names only, never values");
  });
});

test("without a key restricted data is unavailable (503) but the directory still works", async () => {
  await withServer(undefined, async ({ call, t }) => {
    const p = await (await call("POST", "/v1/personnel", t.editor, person)).json();
    assert.equal((await call("GET", `/v1/personnel/${p.code}/private`, t.admin)).status, 503);
    assert.equal((await call("PATCH", `/v1/personnel/${p.code}/private`, t.admin, { address: "x" })).status, 503);
    assert.equal((await call("GET", `/v1/personnel/${p.code}`, t.editor)).status, 200);
  });
});

test("M13 head of unit: must be an active person; shown publicly only if that person is public; deactivating a head is refused", async () => {
  await withServer(KEY, async ({ call, t }) => {
    const p = await (await call("POST", "/v1/personnel", t.editor, person)).json();
    const unit = await (await call("POST", "/v1/departments", t.publisher, { nameTh: "กอง", nameEn: "Division", status: "published" })).json();
    const units = async () => (await (await call("GET", "/v1/public/departments")).json()).departments;
    assert.equal((await call("PATCH", `/v1/departments/${unit.code}`, t.publisher, { headPersonnelCode: "RAE-PS-0099" })).status, 400, "unknown person");
    assert.equal((await call("PATCH", `/v1/departments/${unit.code}`, t.publisher, { headPersonnelCode: p.code })).status, 200);
    assert.equal((await units())[0].head, null, "a non-public head is not disclosed");
    await call("PATCH", `/v1/personnel/${p.code}`, t.publisher, { isPublic: true, consent: true });
    const [d] = await units();
    assert.equal(d.head.code, p.code);
    assert.ok(!JSON.stringify(d.head).includes("email") && !JSON.stringify(d.head).includes("employeeCode"));
    assert.equal((await call("PATCH", `/v1/personnel/${p.code}`, t.publisher, { status: "inactive" })).status, 400, "cannot deactivate a head");
    assert.equal((await call("PATCH", `/v1/departments/${unit.code}`, t.publisher, { headPersonnelCode: null })).status, 200);
    assert.equal((await call("PATCH", `/v1/personnel/${p.code}`, t.publisher, { status: "inactive" })).status, 200);
    assert.equal((await call("PATCH", `/v1/departments/${unit.code}`, t.publisher, { headPersonnelCode: p.code })).status, 400, "an inactive person cannot be made head");
    // department of a person must exist
    assert.equal((await call("POST", "/v1/personnel", t.editor, { ...person, firstTh: "ก", departmentCode: "RAE-DP-0099" })).status, 400);
  });
});
