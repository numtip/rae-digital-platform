import test from "node:test";
import assert from "node:assert/strict";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { EventInvalid, validateEvent } from "../lib/cms/event-registry.ts";

async function withServer(run) {
  resetRuntime();
  addUser({ id: "officer", role: "officer", password: "officer-password-12" });
  addUser({ id: "publisher", role: "publisher", password: "publisher-password-12" });
  addUser({ id: "viewer", role: "viewer", password: "viewer-password-123" });
  const server = createCmsServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = async (userId, password) => (await (await fetch(`${base}/v1/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, password }) })).json()).token;
  const call = (method, path, token, body) =>
    fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    await run({ call, officer: await login("officer", "officer-password-12"), publisher: await login("publisher", "publisher-password-12"), viewer: await login("viewer", "viewer-password-123") });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const ev = { titleTh: "กิจกรรมทดสอบ", titleEn: "Test event", startsAt: "2026-12-01T09:00:00+07:00", endsAt: "2026-12-01T12:00:00+07:00" };

test("validation: offset required, end not before start, known status", () => {
  assert.equal(validateEvent(ev).startsAt, Date.parse("2026-12-01T02:00:00Z"));
  assert.throws(() => validateEvent({ ...ev, startsAt: "2026-12-01T09:00" }), EventInvalid, "a bare local time is refused");
  assert.throws(() => validateEvent({ ...ev, startsAt: "tomorrow" }), EventInvalid);
  assert.throws(() => validateEvent({ ...ev, endsAt: "2026-12-01T08:00:00+07:00" }), EventInvalid);
  assert.throws(() => validateEvent({ ...ev, titleEn: "" }), EventInvalid);
  assert.throws(() => validateEvent({ ...ev, status: "live" }), EventInvalid);
  assert.equal(validateEvent({ ...ev, endsAt: null }).endsAt, null);
});

test("event lifecycle: empty by default, draft hidden, publisher publishes, cancelled stays visible flagged, archive hides", async () => {
  await withServer(async ({ call, officer, publisher, viewer }) => {
    const pub = async () => (await (await call("GET", "/v1/public/events")).json()).events;
    assert.deepEqual(await pub(), []);
    assert.equal((await call("POST", "/v1/events", null, ev)).status, 401);
    assert.equal((await call("POST", "/v1/events", viewer, ev)).status, 403);
    const created = await (await call("POST", "/v1/events", officer, ev)).json();
    assert.equal(created.code, "RAE-EV-0001");
    assert.equal((await call("POST", "/v1/events", officer, { ...ev, status: "published" })).status, 403);
    assert.equal((await call("POST", "/v1/events", officer, { ...ev, startsAt: "bad" })).status, 400);
    assert.equal((await pub()).length, 0, "drafts are not public");

    assert.equal((await call("PATCH", `/v1/events/${created.code}`, officer, { status: "published" })).status, 403);
    assert.equal((await call("PATCH", `/v1/events/${created.code}`, publisher, { status: "published" })).status, 200);
    const later = await (await call("POST", "/v1/events", publisher, { ...ev, titleEn: "Earlier", startsAt: "2026-11-30T09:00:00+07:00", endsAt: null, status: "published" })).json();
    const list = await pub();
    assert.deepEqual(list.map((e) => e.code), [later.code, created.code], "ordered by start time");
    assert.ok(!("createdBy" in list[0]) && !("status" in list[0]));

    assert.equal((await call("PATCH", `/v1/events/${created.code}`, officer, { titleEn: "x" })).status, 403, "editing a public event is a publisher's decision");
    assert.equal((await call("PATCH", `/v1/events/${created.code}`, publisher, { status: "cancelled" })).status, 200);
    assert.equal((await pub()).find((e) => e.code === created.code).cancelled, true);
    assert.equal((await call("PATCH", `/v1/events/${created.code}`, publisher, { status: "archived" })).status, 200);
    assert.deepEqual((await pub()).map((e) => e.code), [later.code]);
  });
});
