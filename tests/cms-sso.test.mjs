import { existsSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { addUser, createCmsServer, memoryRepository, resetRuntime } from "../cms-runtime/server.mjs";
import { createSso } from "../cms-runtime/sso.mjs";

// The adapter source is private (numtip/mju-sso-integration), so CI cannot load it. Run these
// locally with MJU_SSO_MODULE=/path/to/mju-sso-integration/src/index.js; otherwise they skip.
const MODULE = process.env.MJU_SSO_MODULE;
const skip = MODULE && existsSync(MODULE) ? false : "MJU_SSO_MODULE is not set (private adapter)";

// The provider is faked at the token client; no network, no real identifier. The subject is a
// synthetic humanID. Nothing here talks to sso.mju.ac.th.
const ENV = {
  MJU_SSO_MODULE: MODULE,
  MJU_SSO_ENABLED: "true",
  MJU_CLIENT_ID: "00000000-test-client",
  MJU_SSO_ALLOW_UNVERIFIED_CONTRACT: "true",
  MJU_SSO_SUBJECT_CLAIM: "humanID",
};
const fakeProvider = (humanID = "H-1") => ({
  kind: "mju-token-client",
  async exchange() {
    return { citizenID: "0000000000000", humanID, personID: humanID };
  },
});

async function boot({ env = ENV, humanID } = {}) {
  resetRuntime();
  addUser({ id: "admin", role: "admin", password: "admin-password-123" });
  addUser({ id: "officer", role: "officer", password: "officer-password-12" });
  const repository = memoryRepository();
  const sso = await createSso({ repository, env, adapterDeps: { tokenClient: fakeProvider(humanID) } });
  const server = createCmsServer({ repository, sso });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, repository, close: () => new Promise((r) => server.close(r)) };
}

const cookieJar = (response) =>
  Object.fromEntries(response.headers.getSetCookie().map((c) => c.split(";")[0].split("=")).map(([k, v]) => [k, v]));

async function signIn(base, code = "ABCDEF0123456789ABCDEF0123456789") {
  const start = await fetch(`${base}/v1/sso/login`, { redirect: "manual" });
  const attempt = cookieJar(start).mju_sso_attempt;
  const callback = await fetch(`${base}/v1/sso/callback?ac=${code}`, {
    redirect: "manual",
    headers: { cookie: `mju_sso_attempt=${attempt}` },
  });
  return { start, callback };
}

test("SSO is absent unless explicitly enabled", { skip }, async () => {
  const ctx = await boot({ env: {} });
  try {
    for (const path of ["/v1/sso/status", "/v1/sso/login", "/v1/sso/callback"]) {
      assert.equal((await fetch(`${ctx.base}${path}`, { redirect: "manual" })).status, 404, path);
    }
    // local login still works
    const r = await fetch(`${ctx.base}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: "admin", password: "admin-password-123" }) });
    assert.equal(r.status, 200);
  } finally {
    await ctx.close();
  }
});

test("an unknown identity is refused and recorded as pending, never approved", { skip }, async () => {
  const ctx = await boot();
  try {
    const { start, callback } = await signIn(ctx.base);
    assert.equal(start.status, 302);
    assert.match(start.headers.get("location"), /^https:\/\/sso\.mju\.ac\.th\//);
    assert.equal(callback.status, 303);
    assert.match(callback.headers.get("location"), /sso_error=/);
    assert.ok(!callback.headers.getSetCookie().some((c) => c.startsWith("rae_sso_handoff=") && !c.includes("Max-Age=0")));
    const links = await ctx.repository.listSsoLinks();
    assert.equal(links.length, 1);
    assert.equal(links[0].status, "pending");
    assert.equal(links[0].userId, null);
    // a second attempt is refused too (pending is not approved)
    const again = await signIn(ctx.base, "FEDCBA9876543210FEDCBA9876543210");
    assert.match(again.callback.headers.get("location"), /sso_error=/);
  } finally {
    await ctx.close();
  }
});

test("approved link signs in once, rotates the session, keeps the local role, and logs out", { skip }, async () => {
  const ctx = await boot();
  try {
    await signIn(ctx.base); // creates the pending row
    const adminLogin = await (await fetch(`${ctx.base}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: "admin", password: "admin-password-123" }) })).json();
    const admin = { authorization: `Bearer ${adminLogin.token}`, "content-type": "application/json" };

    // only an administrator may see or approve links
    const officerLogin = await (await fetch(`${ctx.base}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: "officer", password: "officer-password-12" }) })).json();
    const denied = await fetch(`${ctx.base}/v1/sso/links`, { headers: { authorization: `Bearer ${officerLogin.token}` } });
    assert.equal(denied.status, 403);
    assert.equal((await fetch(`${ctx.base}/v1/sso/links`)).status, 401);

    const listed = await (await fetch(`${ctx.base}/v1/sso/links`, { headers: admin })).json();
    assert.equal(listed.links.length, 1);
    assert.equal(listed.links[0].ref.length, 8);
    assert.ok(!JSON.stringify(listed).includes("H-1"));
    const id = listed.links[0].id;
    const approve = await fetch(`${ctx.base}/v1/sso/links/${id}/approve`, { method: "POST", headers: admin, body: JSON.stringify({ userId: "officer" }) });
    assert.equal(approve.status, 200);
    // the same link cannot be approved twice
    assert.equal((await fetch(`${ctx.base}/v1/sso/links/${id}/approve`, { method: "POST", headers: admin, body: JSON.stringify({ userId: "admin" }) })).status, 409);

    const { callback } = await signIn(ctx.base, "0123456789ABCDEF0123456789ABCDEF");
    assert.equal(callback.status, 303);
    assert.match(callback.headers.get("location"), /\?sso=1$/);
    const handoff = cookieJar(callback).rae_sso_handoff;
    assert.ok(handoff);
    assert.doesNotMatch(callback.headers.get("location"), new RegExp(handoff));

    // exchange rotates: the presented (old) bearer dies, a new one is minted, the handoff is single-use
    const ex = await fetch(`${ctx.base}/v1/sso/exchange`, { method: "POST", headers: { cookie: `rae_sso_handoff=${handoff}`, authorization: `Bearer ${officerLogin.token}` } });
    assert.equal(ex.status, 200);
    const { token, csrf } = await ex.json();
    assert.notEqual(token, officerLogin.token);
    assert.equal((await fetch(`${ctx.base}/v1/news`, { headers: { authorization: `Bearer ${officerLogin.token}` } })).status, 401);
    assert.equal((await fetch(`${ctx.base}/v1/sso/exchange`, { method: "POST", headers: { cookie: `rae_sso_handoff=${handoff}` } })).status, 401);

    // RBAC is the local role: officer cannot approve links
    assert.equal((await fetch(`${ctx.base}/v1/sso/links`, { headers: { authorization: `Bearer ${token}` } })).status, 403);
    assert.equal((await fetch(`${ctx.base}/v1/news`, { headers: { authorization: `Bearer ${token}` } })).status, 200);

    // logout: wrong CSRF refused and session kept; right CSRF revokes and returns the provider sign-out
    const bad = await fetch(`${ctx.base}/v1/sso/logout`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ csrf: "nope" }) });
    assert.equal(bad.status, 403);
    assert.equal((await fetch(`${ctx.base}/v1/news`, { headers: { authorization: `Bearer ${token}` } })).status, 200);
    assert.equal((await fetch(`${ctx.base}/v1/sso/logout`, { method: "GET", headers: { authorization: `Bearer ${token}` } })).status, 405);
    const out = await fetch(`${ctx.base}/v1/sso/logout`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ csrf }) });
    assert.equal(out.status, 200);
    assert.match((await out.json()).signoutUrl, /^https:\/\/sso\.mju\.ac\.th\/signout/);
    assert.equal((await fetch(`${ctx.base}/v1/news`, { headers: { authorization: `Bearer ${token}` } })).status, 401);

    // revocation closes the door again
    await fetch(`${ctx.base}/v1/sso/links/${id}/revoke`, { method: "POST", headers: admin, body: "{}" });
    const after = await signIn(ctx.base, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    assert.match(after.callback.headers.get("location"), /sso_error=/);
  } finally {
    await ctx.close();
  }
});

test("a replayed or wrong-method callback never signs anyone in", { skip }, async () => {
  const ctx = await boot();
  try {
    assert.equal((await fetch(`${ctx.base}/v1/sso/callback?ac=ABCDEF0123456789ABCDEF0123456789`, { method: "POST", redirect: "manual" })).status, 303);
    const noAttempt = await fetch(`${ctx.base}/v1/sso/callback?ac=ABCDEF0123456789ABCDEF0123456789`, { redirect: "manual" });
    assert.match(noAttempt.headers.get("location"), /sso_error=/);
    assert.equal((await ctx.repository.listSsoLinks()).length, 0);
  } finally {
    await ctx.close();
  }
});

test("a consumed login code stays consumed across a restart with the file store", { skip }, async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const root = mkdtempSync(join(tmpdir(), "sso-state-"));
  const env = { ...ENV, MJU_SSO_STORE_DRIVER: "file", MJU_SSO_STORE_FILE_ROOT: root, MJU_SSO_STORE_REQUIRE_DURABLE: "true" };
  const first = await boot({ env });
  let attempt;
  try {
    const start = await fetch(`${first.base}/v1/sso/login`, { redirect: "manual" });
    attempt = cookieJar(start).mju_sso_attempt;
  } finally {
    await first.close();
  }
  // "restart": a new process-equivalent over the same state directory still knows the attempt
  const second = await boot({ env });
  try {
    const cb = await fetch(`${second.base}/v1/sso/callback?ac=ABCDEF0123456789ABCDEF0123456789`, { redirect: "manual", headers: { cookie: `mju_sso_attempt=${attempt}` } });
    // attempt survived (so it reaches the identity gate: unlinked), and is burned by this use
    assert.match(cb.headers.get("location"), /sso_error=SSO_IDENTITY_UNLINKED/);
    const again = await fetch(`${second.base}/v1/sso/callback?ac=ABCDEF0123456789ABCDEF0123456789`, { redirect: "manual", headers: { cookie: `mju_sso_attempt=${attempt}` } });
    assert.match(again.headers.get("location"), /sso_error=SSO_ATTEMPT_MISSING/);
  } finally {
    await second.close();
  }
  // durable required but memory configured: refuse to start
  await assert.rejects(() => createSso({ repository: memoryRepository(), env: { ...ENV, MJU_SSO_STORE_REQUIRE_DURABLE: "true" } }));
});
