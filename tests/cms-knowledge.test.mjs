import test from "node:test";
import assert from "node:assert/strict";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { KnowledgeInvalid, validateKnowledge } from "../lib/cms/knowledge-registry.ts";

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

const entry = { questionTh: "คำถามทดสอบ", questionEn: "Test question", answerTh: "คำตอบทดสอบ", answerEn: "Test answer" };

test("validation: both languages required, bounded, known status", () => {
  assert.equal(validateKnowledge(entry).status, "draft");
  assert.throws(() => validateKnowledge({ ...entry, answerEn: "" }), KnowledgeInvalid);
  assert.throws(() => validateKnowledge({ ...entry, status: "live" }), KnowledgeInvalid);
  assert.throws(() => validateKnowledge({ ...entry, sortOrder: -1 }), KnowledgeInvalid);
  assert.throws(() => validateKnowledge({ ...entry, questionEn: "x".repeat(301) }), KnowledgeInvalid);
});

test("FAQ lifecycle: empty by default, draft hidden, publisher releases, edit of a published entry needs a publisher, archive hides", async () => {
  await withServer(async ({ call, officer, publisher, viewer }) => {
    const publicList = async () => (await (await call("GET", "/v1/public/knowledge")).json()).entries;
    assert.deepEqual(await publicList(), [], "nothing is seeded");
    assert.equal((await call("POST", "/v1/knowledge", null, entry)).status, 401);
    assert.equal((await call("POST", "/v1/knowledge", viewer, entry)).status, 403);
    const created = await (await call("POST", "/v1/knowledge", officer, { ...entry, sortOrder: 20 })).json();
    assert.equal(created.code, "RAE-KB-0001");
    assert.equal((await call("POST", "/v1/knowledge", officer, { ...entry, status: "published" })).status, 403, "an officer cannot publish");
    assert.equal((await call("POST", "/v1/knowledge", officer, { ...entry, answerTh: "" })).status, 400);
    assert.equal((await publicList()).length, 0, "drafts are not public");

    assert.equal((await call("PATCH", `/v1/knowledge/${created.code}`, officer, { status: "published" })).status, 403);
    assert.equal((await call("PATCH", `/v1/knowledge/${created.code}`, publisher, { status: "published" })).status, 200);
    const second = await (await call("POST", "/v1/knowledge", publisher, { ...entry, questionEn: "First in order", sortOrder: 10, status: "published" })).json();
    const list = await publicList();
    assert.deepEqual(list.map((e) => e.code), [second.code, created.code], "ordered by sortOrder");
    assert.ok(!("createdBy" in list[0]), "no author on the public view");

    assert.equal((await call("PATCH", `/v1/knowledge/${created.code}`, officer, { answerEn: "changed" })).status, 403, "editing a published entry is a publisher's decision");
    assert.equal((await call("PATCH", `/v1/knowledge/${created.code}`, publisher, { answerEn: "changed" })).status, 200);
    assert.equal((await publicList()).find((e) => e.code === created.code).answerEn, "changed");

    assert.equal((await call("PATCH", `/v1/knowledge/${created.code}`, publisher, { status: "archived" })).status, 200);
    assert.deepEqual((await publicList()).map((e) => e.code), [second.code]);
    assert.equal((await call("GET", "/v1/knowledge/RAE-KB-0099", publisher)).status, 404);
  });
});
