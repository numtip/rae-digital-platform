import test from "node:test";
import assert from "node:assert/strict";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { AnnouncementInvalid, validateAnnouncement, validateLink } from "../lib/cms/announcement-registry.ts";

const base = { kind: "banner", titleTh: "ประกาศ", titleEn: "Notice", startsAt: "2026-12-01T09:00:00+07:00", endsAt: "2026-12-02T09:00:00+07:00" };

test("validation: kind, window with mandatory expiry, popup needs text, safe links only", () => {
  assert.equal(validateAnnouncement(base).startsAt, Date.parse("2026-12-01T02:00:00Z"));
  assert.throws(() => validateAnnouncement({ ...base, kind: "modal" }), AnnouncementInvalid);
  assert.throws(() => validateAnnouncement({ ...base, endsAt: undefined }), AnnouncementInvalid, "no expiry is refused");
  assert.throws(() => validateAnnouncement({ ...base, endsAt: base.startsAt }), AnnouncementInvalid);
  assert.throws(() => validateAnnouncement({ ...base, startsAt: "2026-12-01T09:00" }), AnnouncementInvalid, "offset required");
  assert.throws(() => validateAnnouncement({ ...base, kind: "popup" }), AnnouncementInvalid, "a popup needs body text");
  assert.equal(validateLink(""), "");
  assert.equal(validateLink("/th/news/events"), "/th/news/events");
  assert.equal(validateLink("https://example.org/a"), "https://example.org/a");
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.example", "http://example.org", "/admin", "/th//evil", "https://u:p@example.org/", "/th/ x"]) {
    assert.throws(() => validateLink(bad), AnnouncementInvalid, bad);
  }
});

async function withServer(run) {
  resetRuntime();
  addUser({ id: "officer", role: "officer", password: "officer-password-12" });
  addUser({ id: "publisher", role: "publisher", password: "publisher-password-12" });
  addUser({ id: "viewer", role: "viewer", password: "viewer-password-123" });
  const clock = { t: Date.parse("2026-12-01T03:00:00Z") };
  const server = createCmsServer({ now: () => clock.t });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const login = async (userId, password) => (await (await fetch(`${url}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, password }) })).json()).token;
  const call = (method, path, token, body) => fetch(`${url}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    await run({ call, clock, officer: await login("officer", "officer-password-12"), publisher: await login("publisher", "publisher-password-12"), viewer: await login("viewer", "viewer-password-123") });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("lifecycle: draft hidden, publisher publishes, window and expiry enforced by the server clock, archive hides", async () => {
  await withServer(async ({ call, clock, officer, publisher, viewer }) => {
    const live = async () => (await (await call("GET", "/v1/public/announcements")).json()).announcements;
    assert.deepEqual(await live(), []);
    assert.equal((await call("POST", "/v1/announcements", null, base)).status, 401);
    assert.equal((await call("POST", "/v1/announcements", viewer, base)).status, 403);
    const created = await (await call("POST", "/v1/announcements", officer, base)).json();
    assert.equal(created.code, "RAE-AN-0001");
    assert.equal((await call("POST", "/v1/announcements", officer, { ...base, status: "published" })).status, 403);
    assert.equal((await call("POST", "/v1/announcements", officer, { ...base, linkUrl: "javascript:alert(1)" })).status, 400);
    assert.equal((await live()).length, 0, "a draft is never live");

    assert.equal((await call("PATCH", `/v1/announcements/${created.code}`, officer, { status: "published" })).status, 403);
    assert.equal((await call("PATCH", `/v1/announcements/${created.code}`, publisher, { status: "published" })).status, 200);
    assert.equal((await live()).length, 1, "inside its window (10:00 Bangkok, window 09:00 → next day 09:00)");
    const [a] = await live();
    assert.ok(!("createdBy" in a) && !("status" in a));

    clock.t = Date.parse("2026-12-01T01:59:59Z"); // before start
    assert.equal((await live()).length, 0, "not yet");
    clock.t = Date.parse("2026-12-02T02:00:00Z"); // exactly the expiry
    assert.equal((await live()).length, 0, "expired at endsAt, no matter what the page cached");
    clock.t = Date.parse("2026-12-01T03:00:00Z");
    assert.equal((await call("PATCH", `/v1/announcements/${created.code}`, officer, { titleEn: "x" })).status, 403, "editing a published one is a publisher's decision");
    assert.equal((await call("PATCH", `/v1/announcements/${created.code}`, publisher, { status: "archived" })).status, 200);
    assert.equal((await live()).length, 0);
  });
});
