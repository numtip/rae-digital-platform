import test from "node:test";
import assert from "node:assert/strict";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";

test("dashboard: counts per module for editors+, recent activity only with audit:read, read only", async () => {
  resetRuntime();
  addUser({ id: "admin", role: "admin", password: "admin-password-1234" });
  addUser({ id: "editor", role: "editor", password: "editor-password-123" });
  addUser({ id: "officer", role: "officer", password: "officer-password-12" });
  addUser({ id: "publisher", role: "publisher", password: "publisher-password-12" });
  const now = Date.parse("2026-12-01T03:00:00Z");
  const server = createCmsServer({ now: () => now });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const login = async (userId, password) => (await (await fetch(`${url}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, password }) })).json()).token;
  const call = (method, path, token, body) => fetch(`${url}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    const [admin, editor, officer, publisher] = [await login("admin", "admin-password-1234"), await login("editor", "editor-password-123"), await login("officer", "officer-password-12"), await login("publisher", "publisher-password-12")];
    assert.equal((await call("GET", "/v1/dashboard", null)).status, 401);
    assert.equal((await call("GET", "/v1/dashboard", officer)).status, 403);
    await call("POST", "/v1/knowledge", publisher, { questionTh: "ก", questionEn: "q", answerTh: "ข", answerEn: "a", status: "published" });
    await call("POST", "/v1/events", publisher, { titleTh: "ก", titleEn: "e", startsAt: "2026-12-05T09:00:00+07:00", status: "published" });
    await call("POST", "/v1/events", publisher, { titleTh: "ก", titleEn: "past", startsAt: "2026-11-01T09:00:00+07:00", status: "published" });
    await call("POST", "/v1/announcements", publisher, { kind: "banner", titleTh: "ก", titleEn: "a", startsAt: "2026-12-01T09:00:00+07:00", endsAt: "2026-12-02T09:00:00+07:00", status: "published" });
    const d = await (await call("GET", "/v1/dashboard", editor)).json();
    assert.equal(d.knowledge.published, 1);
    assert.equal(d.events.upcoming, 1, "only the future published event is upcoming");
    assert.equal(d.announcements.liveNow, 1);
    assert.equal(d.contact.enabled, false);
    assert.equal(d.views7d, null, "analytics off -> no number");
    assert.ok(!("recent" in d), "an editor has no audit:read");
    const a = await (await call("GET", "/v1/dashboard", admin)).json();
    assert.ok(a.recent.length >= 3 && a.recent.every((r) => !("before" in r) && !("after" in r)), "admin sees recent activity without payloads");
    assert.equal((await call("POST", "/v1/dashboard", admin, {})).status, 404, "no write surface");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
