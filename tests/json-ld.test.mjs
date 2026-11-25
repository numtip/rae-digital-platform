import test from "node:test";
import assert from "node:assert/strict";
import { jsonLdScript } from "../lib/json-ld.ts";
import { addUser, hashPassword, notifySite, resetRuntime } from "../cms-runtime/server.mjs";

test("a title cannot close the JSON-LD script element", () => {
  const out = jsonLdScript({ headline: "ประกาศ</script><script>alert(1)</script>" });
  assert.ok(!out.includes("<"), "no raw angle bracket survives");
  assert.equal(JSON.parse(out).headline, "ประกาศ</script><script>alert(1)</script>");
});

test("the password rule applies where the hash is made", () => {
  assert.throws(() => hashPassword("short"), /at least 12/);
  resetRuntime();
  assert.throws(() => addUser({ id: "x", role: "viewer", password: "a" }), /at least 12/);
});

test("the site hook is called with the secret, and a missing secret is reported as not notified", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => (calls.push({ url, init }), { ok: true, status: 200 });
  assert.equal(await notifySite({ withdrawn: ["a"] }, { RAE_REVALIDATE_SECRET: "s" }, fetchImpl), true);
  assert.equal(calls[0].init.headers["x-revalidate-secret"], "s");
  assert.equal(calls[0].init.body, '{"withdrawn":["a"]}');
  assert.equal(await notifySite({}, {}, fetchImpl), false);
  // several renderers: all must be told, and one failing makes the whole call false
  const seen = [];
  const two = { RAE_REVALIDATE_SECRET: "s", RAE_SITE_REVALIDATE_URL: "http://a/x, http://b/y" };
  assert.equal(await notifySite({}, two, async (url) => (seen.push(url), { ok: true })), true);
  assert.deepEqual(seen.sort(), ["http://a/x", "http://b/y"]);
  assert.equal(await notifySite({}, two, async (url) => ({ ok: url.includes("a") })), false);
  assert.equal(calls.length, 1, "no secret, no request");
  assert.equal(await notifySite({}, { RAE_REVALIDATE_SECRET: "s" }, async () => ({ ok: false, status: 500 })), false);
});

test("an audit failure rolls the article write back, so a retry can publish", async () => {
  const { createCmsServer, memoryRepository } = await import("../cms-runtime/server.mjs");
  resetRuntime();
  addUser({ id: "author", role: "publisher", password: "author-password-12" });
  addUser({ id: "reviewer", role: "editor", password: "reviewer-password-12" });
  const repo = memoryRepository();
  let failAudit = false;
  const original = repo.appendAudit;
  repo.appendAudit = async (record) => {
    if (failAudit && record.action === "news.publish") throw new Error("audit down");
    return original(record);
  };
  const server = createCmsServer({ repository: repo });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = async (userId, password) =>
    (await (await fetch(`${base}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, password }) })).json()).token;
  try {
    const a = { "content-type": "application/json", authorization: `Bearer ${await login("author", "author-password-12")}` };
    const r = { "content-type": "application/json", authorization: `Bearer ${await login("reviewer", "reviewer-password-12")}` };
    await fetch(`${base}/v1/news`, { method: "POST", headers: a, body: JSON.stringify({ id: "tx-1", titleTh: "ก", titleEn: "A", source: "https://rae.mju.ac.th/t", bodyTh: ["ก"], bodyEn: ["A"] }) });
    await fetch(`${base}/v1/news/tx-1/submit`, { method: "POST", headers: a });
    await fetch(`${base}/v1/news/tx-1/approve`, { method: "POST", headers: r });
    failAudit = true;
    const failed = await fetch(`${base}/v1/news/tx-1/publish`, { method: "POST", headers: a });
    assert.ok(failed.status >= 400);
    assert.equal((await repo.getArticle("tx-1")).status, "approved", "the article write was rolled back");
    failAudit = false;
    assert.equal((await fetch(`${base}/v1/news/tx-1/publish`, { method: "POST", headers: a })).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    resetRuntime();
  }
});
