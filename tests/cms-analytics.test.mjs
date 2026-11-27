import test from "node:test";
import assert from "node:assert/strict";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { MAX_PATHS_PER_DAY, bangkokDay, normalizeAnalyticsPath, readAnalyticsConfig } from "../lib/cms/analytics.ts";

test("path normalisation accepts public localized pages only", () => {
  assert.equal(normalizeAnalyticsPath("/th"), "/th");
  assert.equal(normalizeAnalyticsPath("/th/news/events/"), "/th/news/events");
  assert.equal(normalizeAnalyticsPath("/en/documents/RAE-DC-0042"), "/en/documents/rae-dc-*", "record codes collapse so cardinality stays bounded");
  for (const bad of ["/th/cms-admin", "/th/cms-admin/x", "/api/x", "https://evil.example/th", "/th/a?b=1", "/th/a#x", "//th", "/fr/x", "/th/" + "a".repeat(130), 7, null, undefined]) {
    assert.equal(normalizeAnalyticsPath(bad), null, String(bad));
  }
});

test("Bangkok day boundary and config", () => {
  assert.equal(bangkokDay(Date.parse("2026-11-26T16:59:59Z")), "2026-11-26");
  assert.equal(bangkokDay(Date.parse("2026-11-26T17:00:00Z")), "2026-11-27");
  assert.equal(readAnalyticsConfig({}).enabled, false);
  assert.deepEqual(readAnalyticsConfig({ ANALYTICS_ENABLED: "true", ANALYTICS_ALLOWED_ORIGINS: "https://a.example,http://bad" }), { enabled: true, allowedOrigins: ["https://a.example"] });
  assert.ok(MAX_PATHS_PER_DAY > 100);
});

async function withServer(analytics, run) {
  resetRuntime();
  addUser({ id: "editor", role: "editor", password: "editor-password-123" });
  addUser({ id: "officer", role: "officer", password: "officer-password-12" });
  const clock = Date.parse("2026-11-27T05:00:00Z");
  const server = createCmsServer({ analytics, now: () => clock });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = async (userId, password) => (await (await fetch(`${base}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, password }) })).json()).token;
  const hit = (path, headers = {}) => fetch(`${base}/v1/public/analytics/hit`, { method: "POST", headers: { "content-type": "text/plain", ...headers }, body: JSON.stringify({ path }) });
  const report = (token) => fetch(`${base}/v1/analytics`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  try {
    await run({ hit, report, editor: await login("editor", "editor-password-123"), officer: await login("officer", "officer-password-12") });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("disabled: nothing is counted and the endpoint is 404", async () => {
  await withServer({ enabled: false }, async ({ hit, report, editor }) => {
    assert.equal((await hit("/th")).status, 404);
    assert.equal((await (await report(editor)).json()).enabled, false);
  });
});

test("enabled: anonymous counts per day and path, editors read them, bad paths and foreign origins ignored", async () => {
  await withServer({ enabled: true, allowedOrigins: ["https://raeservice.mju.ac.th"] }, async ({ hit, report, editor, officer }) => {
    const ok = { origin: "https://raeservice.mju.ac.th", "cf-connecting-ip": "203.0.113.1" };
    assert.equal((await hit("/th/news/", ok)).status, 204);
    assert.equal((await hit("/th/news", ok)).status, 204);
    assert.equal((await hit("/th/cms-admin", ok)).status, 204, "ignored but not an error");
    assert.equal((await hit("/th/news", { origin: "https://evil.example", "cf-connecting-ip": "203.0.113.2" })).status, 204, "foreign origin: not counted");
    assert.equal((await report(null)).status, 401);
    assert.equal((await report(officer)).status, 403);
    const body = await (await report(editor)).json();
    assert.deepEqual(body.rows, [{ day: "2026-11-27", path: "/th/news", hits: 2 }]);
    assert.ok(!JSON.stringify(body).includes("203.0.113"), "no address kept");
  });
});

test("rate limit per client: the 121st hit in a minute is dropped silently", async () => {
  await withServer({ enabled: true, allowedOrigins: [] }, async ({ hit, report, editor }) => {
    for (let i = 0; i < 125; i += 1) await hit("/th", { "cf-connecting-ip": "198.51.100.4" });
    assert.equal((await (await report(editor)).json()).rows[0].hits, 120);
  });
});
