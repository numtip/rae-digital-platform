import test from "node:test";
import assert from "node:assert/strict";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { DocumentInvalid, validateNewDocument } from "../lib/cms/document-registry.ts";

const URL_OK = "https://maejo365-my.sharepoint.com/:b:/g/personal/rae/Abc123/form-leave.pdf";

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

const draft = { category: "administration", titleTh: "แบบฟอร์มลา", titleEn: "Leave form", storageUrl: URL_OK };

test("only a MJU SharePoint file link is accepted, and the file type comes from the link", () => {
  assert.equal(validateNewDocument(draft).docType, "pdf");
  for (const storageUrl of ["http://maejo365-my.sharepoint.com/a/b.pdf", "https://example.com/a/b.pdf", "https://maejo365-my.sharepoint.com/personal/rae/Documents/Forms", "not a url"]) {
    assert.throws(() => validateNewDocument({ ...draft, storageUrl }), DocumentInvalid, storageUrl);
  }
  assert.throws(() => validateNewDocument({ ...draft, category: "nope" }), DocumentInvalid);
  assert.throws(() => validateNewDocument({ ...draft, titleEn: "" }), DocumentInvalid);
});

test("registry lifecycle: draft is hidden, publisher makes it current, counted open, new version, obsolete hides it", async () => {
  await withServer(async ({ call, officer, publisher, viewer }) => {
    // permissions
    assert.equal((await call("POST", "/v1/documents", viewer, draft)).status, 403);
    assert.equal((await call("POST", "/v1/documents", null, draft)).status, 401);
    const created = await (await call("POST", "/v1/documents", officer, draft)).json();
    assert.match(created.code, /^RAE-DC-0001$/);
    assert.equal((await call("POST", "/v1/documents", officer, { ...draft, status: "current" })).status, 403, "an officer cannot publish");
    assert.equal((await call("POST", "/v1/documents", officer, { ...draft, storageUrl: "https://evil.example/x.pdf" })).status, 400);
    const second = await (await call("POST", "/v1/documents", officer, { ...draft, titleEn: "Second" })).json();
    assert.equal(second.code, "RAE-DC-0002", "codes are sequential and unique");

    const publicList = async () => (await (await call("GET", "/v1/public/documents")).json()).documents;
    assert.equal((await publicList()).length, 0, "drafts are not public");
    assert.equal((await call("POST", `/v1/public/documents/${created.code}/download`)).status, 404, "a draft cannot be opened or counted");

    assert.equal((await call("PATCH", `/v1/documents/${created.code}`, officer, { status: "current" })).status, 403);
    assert.equal((await call("PATCH", `/v1/documents/${created.code}`, publisher, { status: "current" })).status, 200);
    const [listed] = await publicList();
    assert.equal(listed.code, created.code);
    assert.ok(!("storageUrl" in listed) && !("createdBy" in listed), "the public view carries no storage link or author");

    const opened = await (await call("POST", `/v1/public/documents/${created.code}/download`)).json();
    assert.equal(opened.url, URL_OK);
    assert.equal((await publicList())[0].downloadCount, 1);

    // a new file needs a new version number and leaves history
    const sameVersion = await call("PATCH", `/v1/documents/${created.code}`, officer, { storageUrl: URL_OK.replace("form-leave", "form-leave-v2") });
    assert.equal(sameVersion.status, 400);
    const v2 = await call("PATCH", `/v1/documents/${created.code}`, officer, { storageUrl: URL_OK.replace("form-leave", "form-leave-v2"), version: "2.0", changeNote: "new form" });
    assert.equal(v2.status, 200);
    const versions = (await (await call("GET", `/v1/documents/${created.code}/versions`, officer)).json()).versions;
    assert.deepEqual(versions.map((v) => v.version), ["2.0", "1.0"]);

    assert.equal((await call("PATCH", `/v1/documents/${created.code}`, publisher, { status: "obsolete" })).status, 200);
    assert.equal((await publicList()).length, 0, "an obsolete document leaves the public list");
    assert.equal((await call("POST", `/v1/public/documents/${created.code}/download`)).status, 404);
  });
});

test("link health: broken, unreachable and ok are told apart, and only live records are checked", async () => {
  const { linkStatusFromResponse } = await import("../lib/cms/document-registry.ts");
  assert.equal(linkStatusFromResponse(200), "ok");
  assert.equal(linkStatusFromResponse(302), "ok", "a sign-in redirect means the file resolves");
  assert.equal(linkStatusFromResponse(404), "broken");
  assert.equal(linkStatusFromResponse(410), "broken");
  assert.equal(linkStatusFromResponse(503), "unreachable");
  assert.equal(linkStatusFromResponse(429), "unreachable");
  assert.equal(linkStatusFromResponse(null), "unreachable");
  const { checkDocumentLinks, memoryRepository, resetRuntime } = await import("../cms-runtime/server.mjs");
  resetRuntime();
  const repo = memoryRepository();
  const base = { category: "administration", titleTh: "ก", titleEn: "a", docType: "pdf", version: "1.0", visibility: "public", note: "", createdBy: "t", updatedAt: 1 };
  const mk = (n, status) => repo.createDocument({ ...base, status, storageUrl: `https://maejo365-my.sharepoint.com/x/${n}.pdf` }, { actorId: "t", action: "document.create", entityType: "document" });
  await mk("live", "current"); await mk("gone", "current"); await mk("old", "obsolete");
  const seen = [];
  const counts = await checkDocumentLinks(repo, { fetchImpl: async (url) => (seen.push(url), { status: url.includes("gone") ? 404 : 200, body: null }), now: () => 5 });
  assert.deepEqual(counts, { ok: 1, broken: 1, unreachable: 0 });
  assert.equal(seen.length, 2, "an obsolete record is not requested");
  assert.equal((await repo.getDocument("RAE-DC-0002")).linkStatus, "broken");
});

test("the check-links endpoint is for publishers and the public view never carries link health", async () => {
  await withServer(async ({ call, officer, publisher }) => {
    assert.equal((await call("POST", "/v1/documents/check-links", officer)).status, 403);
    const res = await call("POST", "/v1/documents", publisher, { ...draft, status: "current" });
    assert.equal(res.status, 201);
    const checked = await call("POST", "/v1/documents/check-links", publisher);
    assert.equal(checked.status, 202, "the pass runs in the background");
    const [pub] = (await (await call("GET", "/v1/public/documents")).json()).documents;
    assert.ok(!("linkStatus" in pub) && !("linkCheckedAt" in pub));
  });
});
