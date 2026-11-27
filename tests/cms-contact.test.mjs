import test from "node:test";
import assert from "node:assert/strict";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { ContactInvalid, readContactConfig, validateContact } from "../lib/cms/contact-registry.ts";

const NOTICE = { version: "v1-test", th: "ประกาศทดสอบ", en: "Test notice" };
const good = { name: "Somchai", email: "somchai@example.org", subject: "Hello", message: "A question", consent: true, noticeVersion: "v1-test", locale: "en" };

async function withServer(contact, run) {
  resetRuntime();
  addUser({ id: "editor", role: "editor", password: "editor-password-123" });
  addUser({ id: "officer", role: "officer", password: "officer-password-12" });
  let clock = 1_000_000;
  const server = createCmsServer({ contact, now: () => clock });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = async (userId, password) => (await (await fetch(`${base}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, password }) })).json()).token;
  const call = (method, path, token, body, headers = {}) =>
    fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    await run({ call, editor: await login("editor", "editor-password-123"), officer: await login("officer", "officer-password-12"), tick: (ms) => (clock += ms), relogin: () => login("editor", "editor-password-123") });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const ON = { enabled: true, notice: NOTICE, retentionDays: 30, allowedOrigins: ["https://raeservice.mju.ac.th"] };

test("config: off unless enabled, retention and a complete notice are all present", () => {
  const file = JSON.stringify(NOTICE);
  const env = { CONTACT_FORM_ENABLED: "true", CONTACT_RETENTION_DAYS: "90", CONTACT_NOTICE_JSON: "/n.json", CONTACT_ALLOWED_ORIGINS: "https://a.example, http://evil, nope" };
  const read = () => file;
  assert.equal(readContactConfig(env, read).enabled, true);
  assert.deepEqual(readContactConfig(env, read).allowedOrigins, ["https://a.example"]);
  assert.equal(readContactConfig({ ...env, CONTACT_FORM_ENABLED: "false" }, read).enabled, false);
  assert.equal(readContactConfig({ ...env, CONTACT_RETENTION_DAYS: "" }, read).enabled, false);
  assert.equal(readContactConfig({ ...env, CONTACT_RETENTION_DAYS: "0" }, read).enabled, false);
  assert.equal(readContactConfig(env, () => JSON.stringify({ ...NOTICE, en: "" })).enabled, false);
  assert.equal(readContactConfig(env, () => { throw new Error("missing"); }).enabled, false);
});

test("validation: consent for the current notice, valid email, bounded fields", () => {
  assert.equal(validateContact(good, NOTICE).email, "somchai@example.org");
  for (const bad of [{ consent: false }, { consent: "true" }, { noticeVersion: "old" }, { email: "nope" }, { email: "a@b" }, { name: "" }, { message: "x".repeat(4001) }, { subject: "a\u0000b" }]) {
    assert.throws(() => validateContact({ ...good, ...bad }, NOTICE), ContactInvalid, JSON.stringify(bad));
  }
});

test("disabled: no form surface at all", async () => {
  await withServer({ enabled: false }, async ({ call }) => {
    assert.equal((await (await call("GET", "/v1/public/contact/config")).json()).enabled, false);
    assert.equal((await call("POST", "/v1/public/contact", null, good)).status, 404);
  });
});

test("enabled: stores consent record, no IP, inbox for editors only, status, rate limit, honeypot, retention, CORS", async () => {
  await withServer(ON, async ({ call, editor, officer, tick, relogin }) => {
    const cfg = await (await call("GET", "/v1/public/contact/config")).json();
    assert.equal(cfg.notice.version, "v1-test");
    const sent = await call("POST", "/v1/public/contact", null, good, { origin: "https://raeservice.mju.ac.th", "cf-connecting-ip": "203.0.113.5" });
    assert.equal(sent.status, 202);
    assert.equal(sent.headers.get("access-control-allow-origin"), "https://raeservice.mju.ac.th");
    const ref = (await sent.json()).reference;
    assert.equal(ref, "RAE-CT-00001");
    assert.equal((await call("POST", "/v1/public/contact", null, { ...good, consent: false }, { "cf-connecting-ip": "203.0.113.6" })).status, 400);
    const evil = await call("POST", "/v1/public/contact", null, good, { origin: "https://evil.example", "cf-connecting-ip": "203.0.113.7" });
    assert.equal(evil.headers.get("access-control-allow-origin"), null, "only configured origins get CORS");

    // honeypot: looks accepted, nothing stored
    assert.equal((await call("POST", "/v1/public/contact", null, { ...good, website: "http://spam" }, { "cf-connecting-ip": "203.0.113.8" })).status, 202);

    assert.equal((await call("GET", "/v1/contact-messages", null)).status, 401);
    assert.equal((await call("GET", "/v1/contact-messages", officer)).status, 403, "an officer cannot read the inbox");
    const list = (await (await call("GET", "/v1/contact-messages", editor)).json()).messages;
    assert.equal(list.length, 2, "the honeypot post and the invalid one were not stored");
    const stored = list.find((m) => m.code === ref);
    assert.equal(stored.noticeVersion, "v1-test");
    assert.ok(stored.consentedAt > 0);
    assert.ok(!JSON.stringify(stored).includes("203.0.113"), "no IP address is stored");
    assert.equal((await call("PATCH", `/v1/contact-messages/${ref}`, editor, { status: "replied" })).status, 200);
    assert.equal((await call("PATCH", `/v1/contact-messages/${ref}`, editor, { status: "bogus" })).status, 400);
    assert.equal((await call("PATCH", "/v1/contact-messages/RAE-CT-09999", editor, { status: "read" })).status, 404);

    // rate limit: 5 per 10 minutes per client
    let last;
    for (let i = 0; i < 6; i += 1) last = await call("POST", "/v1/public/contact", null, good, { "cf-connecting-ip": "198.51.100.9" });
    assert.equal(last.status, 429);

    // retention: 31 days later the inbox is purged when touched
    tick(31 * 86400_000);
    const fresh = await relogin(); // the old session has expired by then too
    assert.equal((await (await call("GET", "/v1/contact-messages", fresh)).json()).messages.length, 0);
  });
});
