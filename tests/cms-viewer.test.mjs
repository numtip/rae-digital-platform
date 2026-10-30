import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { ROLE_PERMISSIONS, requirePermission } from "../lib/cms/permissions.ts";

// The viewer role is the read-only consumer of the site: it holds no permission, so every write
// route refuses it, and it sees only published rows on the two read endpoints. The role has to be
// real rather than a documentation promise — the tests here are the promise.

const PERMISSIONS = [
  "news:draft",
  "news:review",
  "news:publish",
  "media:upload",
  "document:register",
  "audit:read",
  "user:assign_role",
];

// A 1x1 PNG, enough for the upload's magic-byte check, so a media refusal is a permission
// refusal and not a rejected payload.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function withServer(run) {
  const media = mkdtempSync(join(tmpdir(), "rae-cms-viewer-test-"));
  process.env.RAE_CMS_MEDIA_DIR = media;
  resetRuntime();
  addUser({ id: "viewer", role: "viewer", password: "viewer-password-12" });
  addUser({ id: "officer", role: "officer", password: "officer-password-12" });
  addUser({ id: "reviewer", role: "editor", password: "reviewer-password-12" });
  addUser({ id: "publisher", role: "publisher", password: "publisher-password-12" });
  const server = createCmsServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    resetRuntime();
    delete process.env.RAE_CMS_MEDIA_DIR;
    rmSync(media, { recursive: true, force: true });
  }
}

const auth = (token) => ({ "content-type": "application/json", authorization: `Bearer ${token}` });

async function login(base, userId, password) {
  const response = await fetch(`${base}/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, password }),
  });
  return (await response.json()).token;
}

const article = (id, titleEn) => ({
  id,
  titleTh: "ข่าว",
  titleEn,
  source: "https://rae.mju.ac.th/example",
});

/** Officer creates an article, a reviewer approves it and a publisher releases it. */
async function seed(base) {
  const officer = await login(base, "officer", "officer-password-12");
  const reviewer = await login(base, "reviewer", "reviewer-password-12");
  const publisher = await login(base, "publisher", "publisher-password-12");
  for (const [id, titleEn] of [
    ["n-draft", "Still a draft"],
    ["n-live", "Live on the site"],
  ]) {
    const created = await fetch(`${base}/v1/news`, { method: "POST", headers: auth(officer), body: JSON.stringify(article(id, titleEn)) });
    assert.equal(created.status, 201);
  }
  assert.equal((await fetch(`${base}/v1/news/n-live/submit`, { method: "POST", headers: auth(officer) })).status, 200);
  assert.equal((await fetch(`${base}/v1/news/n-live/approve`, { method: "POST", headers: auth(reviewer) })).status, 200);
  assert.equal((await fetch(`${base}/v1/news/n-live/publish`, { method: "POST", headers: auth(publisher) })).status, 200);
  return { officer };
}

test("the viewer role exists and grants no permission at all", () => {
  // The seeder validates a role by looking it up here, so the key is what makes the role assignable.
  assert.ok("viewer" in ROLE_PERMISSIONS);
  assert.deepEqual(ROLE_PERMISSIONS.viewer, []);
  for (const permission of PERMISSIONS) {
    assert.throws(() => requirePermission("viewer", permission), /missing permission/, `viewer must not hold ${permission}`);
  }
});

test("a viewer is refused on every write route and the article is left untouched", async () => {
  await withServer(async (base) => {
    const { officer } = await seed(base);
    const viewer = await login(base, "viewer", "viewer-password-12");

    const writes = [
      ["POST", "/v1/news", article("n-viewer", "Sneaked in")],
      ["PATCH", "/v1/news/n-draft", { titleEn: "Edited by a viewer" }],
      ["POST", "/v1/news/n-draft/submit", undefined],
      ["POST", "/v1/news/n-draft/return", { reason: "ไม่เห็นด้วย" }],
      ["POST", "/v1/news/n-draft/approve", undefined],
      ["POST", "/v1/news/n-draft/publish", undefined],
      ["POST", "/v1/news/n-draft/media", { dataBase64: PNG_BASE64 }],
    ];
    for (const [method, path, body] of writes) {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: auth(viewer),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      assert.equal(response.status, 403, `${method} ${path} must be refused`);
      assert.equal((await response.json()).error, "PermissionDenied", `${method} ${path} must fail on the permission`);
    }

    // Nothing was created and nothing moved: a refusal is not a partial write.
    const listed = await (await fetch(`${base}/v1/news`, { headers: auth(officer) })).json();
    const draft = listed.articles.find((item) => item.id === "n-draft");
    assert.equal(draft.status, "draft");
    assert.equal(draft.titleEn, "Still a draft");
    assert.equal(listed.articles.some((item) => item.id === "n-viewer"), false);
    const media = await (await fetch(`${base}/v1/news/n-draft/media`, { headers: auth(officer) })).json();
    assert.deepEqual(media.media, []);
  });
});

test("a viewer sees only published rows while an officer still sees the drafts", async () => {
  await withServer(async (base) => {
    const { officer } = await seed(base);
    const viewer = await login(base, "viewer", "viewer-password-12");

    const seen = await (await fetch(`${base}/v1/news`, { headers: auth(viewer) })).json();
    assert.deepEqual(seen.articles.map((item) => item.id), ["n-live"]);
    assert.equal(seen.articles.every((item) => item.status === "published"), true);

    const desk = await (await fetch(`${base}/v1/news`, { headers: auth(officer) })).json();
    const ids = desk.articles.map((item) => item.id).sort();
    assert.deepEqual(ids, ["n-draft", "n-live"], "a drafting role keeps the working set");

    // The filter belongs to the role, not to the endpoint: a session is still required.
    assert.equal((await fetch(`${base}/v1/news`)).status, 401);
  });
});

test("the export is published-only for every role, viewer included", async () => {
  await withServer(async (base) => {
    await seed(base);
    for (const [userId, password] of [
      ["viewer", "viewer-password-12"],
      ["officer", "officer-password-12"],
      ["publisher", "publisher-password-12"],
    ]) {
      const token = await login(base, userId, password);
      const body = await (await fetch(`${base}/v1/export`, { headers: auth(token) })).json();
      assert.deepEqual(body.articles.map((item) => item.id), ["n-live"], `${userId} must only export what is published`);
      // news:draft is not an export permission: the draft's text must not travel at all.
      assert.equal(JSON.stringify(body).includes("Still a draft"), false, `${userId} must not export a draft`);
    }
  });
});
