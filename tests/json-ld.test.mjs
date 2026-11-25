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
  assert.equal(calls.length, 1, "no secret, no request");
  assert.equal(await notifySite({}, { RAE_REVALIDATE_SECRET: "s" }, async () => ({ ok: false, status: 500 })), false);
});
