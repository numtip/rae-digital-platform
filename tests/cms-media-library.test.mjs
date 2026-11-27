import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { inspectUpload, MediaInvalid, validateMediaMeta } from "../lib/cms/media-library.ts";
import { MediaRejected } from "../lib/cms/media.ts";

// 1x1 PNG, and two byte strings that must never be accepted: a Windows executable header and a PDF header.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const OTHER_PNG = Buffer.concat([PNG, Buffer.from([0])]); // different bytes, still a PNG signature
const b64 = (bytes) => Buffer.from(bytes).toString("base64");

async function withServer(run) {
  const dir = mkdtempSync(join(tmpdir(), "rae-media-"));
  process.env.RAE_CMS_MEDIA_DIR = dir;
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
    await run({ call, dir, officer: await login("officer", "officer-password-12"), publisher: await login("publisher", "publisher-password-12"), viewer: await login("viewer", "viewer-password-123") });
  } finally {
    delete process.env.RAE_CMS_MEDIA_DIR;
    await new Promise((resolve) => server.close(resolve));
  }
}

const meta = { titleTh: "ภาพทดสอบ", titleEn: "Test image" };
const upload = (bytes = PNG, extra = {}) => ({ ...meta, dataBase64: b64(bytes), ...extra });

test("validation: titles required in both languages, alt text required before an image can be public", () => {
  assert.equal(validateMediaMeta(meta).status, "draft");
  assert.throws(() => validateMediaMeta({ ...meta, titleEn: "" }), MediaInvalid);
  assert.throws(() => validateMediaMeta({ ...meta, status: "live" }), MediaInvalid);
  assert.throws(() => validateMediaMeta({ ...meta, status: "published", altTh: "ภาพ" }), MediaInvalid);
  assert.equal(validateMediaMeta({ ...meta, status: "published", altTh: "ภาพ", altEn: "image" }).status, "published");
});

test("the bytes decide: png passes; executables, pdf, empty, non-base64 and oversize are refused", () => {
  assert.equal(inspectUpload(b64(PNG)).mime, "image/png");
  assert.throws(() => inspectUpload(b64(Buffer.from("MZ\x90\x00this is not an image"))), MediaRejected);
  assert.throws(() => inspectUpload(b64(Buffer.from("%PDF-1.7 official documents stay in SharePoint"))), MediaRejected);
  assert.throws(() => inspectUpload(""), MediaRejected);
  assert.throws(() => inspectUpload("not base64 !!"), MediaRejected);
  assert.throws(() => inspectUpload(b64(Buffer.concat([PNG, Buffer.alloc(8 * 1024 * 1024)]))), MediaRejected);
});

test("library lifecycle: drafts are private, a publisher releases, the public sees bytes with the stored type, archive hides", async () => {
  await withServer(async ({ call, dir, officer, publisher, viewer }) => {
    const publicList = async () => (await (await call("GET", "/v1/public/media")).json()).assets;
    assert.deepEqual(await publicList(), [], "nothing is seeded");
    assert.equal((await call("POST", "/v1/media-library", null, upload())).status, 401);
    assert.equal((await call("POST", "/v1/media-library", viewer, upload())).status, 403);
    assert.equal((await call("GET", "/v1/media-library", viewer)).status, 403);

    const created = await (await call("POST", "/v1/media-library", officer, upload())).json();
    assert.equal(created.code, "RAE-MD-0001");
    assert.equal(created.status, "draft");
    assert.equal(created.mime, "image/png");
    assert.match(created.filename, /^[0-9a-f]{16}\.png$/);
    assert.equal(readdirSync(join(dir, "library", created.code)).length, 1, "the file sits under library/<code>/");
    assert.deepEqual(readdirSync(join(dir, "library", ".incoming")), [], "nothing is left in staging");

    assert.equal((await call("POST", "/v1/media-library", officer, upload(OTHER_PNG, { status: "published", altTh: "ก", altEn: "a" }))).status, 403, "an officer cannot publish");
    assert.equal((await call("POST", "/v1/media-library", officer, upload(PNG))).status, 409, "the same bytes are not stored twice");
    assert.equal((await call("POST", "/v1/media-library", officer, upload(Buffer.from("MZ\x90\x00 executable"), {}))).status, 400);
    assert.equal((await call("POST", "/v1/media-library", officer, { ...meta, dataBase64: "" })).status, 400);

    const draftFile = `/v1/public/media/${created.code}/${created.filename}`;
    assert.equal((await call("GET", draftFile)).status, 404, "a draft is not public");
    assert.equal((await call("GET", `/v1/media-library/${created.code}/${created.filename}`)).status, 401, "the private file route needs a session");
    const priv = await call("GET", `/v1/media-library/${created.code}/${created.filename}`, officer);
    assert.equal(priv.status, 200);
    assert.equal(priv.headers.get("cache-control"), "private, no-store");

    assert.equal((await call("PATCH", `/v1/media-library/${created.code}`, officer, { status: "published", altTh: "ก", altEn: "a" })).status, 403);
    assert.equal((await call("PATCH", `/v1/media-library/${created.code}`, publisher, { status: "published" })).status, 400, "alt text is required to publish");
    assert.equal((await call("PATCH", `/v1/media-library/${created.code}`, publisher, { status: "published", altTh: "ภาพ", altEn: "image" })).status, 200);

    const list = await publicList();
    assert.equal(list.length, 1);
    assert.ok(!("createdBy" in list[0]) && !("sha256" in list[0]), "no author or checksum on the public view");
    assert.equal(list[0].url, draftFile);
    const served = await call("GET", draftFile);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get("content-type"), "image/png");
    assert.equal(served.headers.get("x-content-type-options"), "nosniff");
    assert.match(served.headers.get("content-security-policy"), /sandbox/);
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), PNG);

    assert.equal((await call("GET", `/v1/public/media/${created.code}/0000000000000000.png`)).status, 404, "only the stored file name is served");
    // A traversal attempt never matches the file route; whichever later handler answers, it is a refusal.
    assert.ok([401, 404].includes((await call("GET", `/v1/public/media/${created.code}/..%2F..%2Fetc%2Fpasswd`)).status));
    assert.ok([401, 404].includes((await call("GET", `/v1/public/media/${created.code}/../../../etc/passwd`)).status));
    assert.equal((await call("PATCH", `/v1/media-library/${created.code}`, officer, { captionEn: "edited" })).status, 403, "editing a published asset is a publisher's decision");

    assert.equal((await call("PATCH", `/v1/media-library/${created.code}`, publisher, { status: "archived" })).status, 200);
    assert.deepEqual(await publicList(), []);
    assert.equal((await call("GET", draftFile)).status, 404, "archived bytes are no longer public");
    assert.equal((await call("POST", "/v1/media-library", officer, upload(PNG))).status, 201, "an archived image frees its bytes for a new upload");
    assert.equal((await call("GET", "/v1/media-library/RAE-MD-0099", publisher)).status, 404);
  });
});

test("news integration: a released library image is copied into the author's draft; nothing else is", async () => {
  await withServer(async ({ call, officer, publisher, viewer }) => {
    const article = { id: "n-lib-1", titleTh: "ข่าว", titleEn: "News", source: "https://rae.mju.ac.th/x" };
    assert.equal((await call("POST", "/v1/news", officer, article)).status, 201);
    const asset = await (await call("POST", "/v1/media-library", officer, upload(PNG, { altTh: "ภาพ", altEn: "image", captionEn: "from library" }))).json();
    const add = (token, body = { code: asset.code }) => call("POST", "/v1/news/n-lib-1/media/from-library", token, body);

    assert.equal((await add(null)).status, 401);
    assert.equal((await add(viewer)).status, 403);
    assert.equal((await add(officer)).status, 400, "a draft library image cannot be used");
    assert.equal((await call("PATCH", `/v1/media-library/${asset.code}`, publisher, { status: "published", altTh: "ภาพ", altEn: "image" })).status, 200);
    assert.equal((await add(officer, { code: "RAE-MD-0099" })).status, 400, "unknown code");
    assert.equal((await add(officer, { code: "../../etc/passwd" })).status, 400, "not a code");
    assert.equal((await add(publisher)).status, 403, "only the article's author may add images");

    const added = await (await add(officer)).json();
    assert.equal(added.position, 1);
    assert.equal(added.mime, "image/png");
    assert.equal(added.altEn, "image");
    assert.equal(added.captionEn, "from library");
    const list = (await (await call("GET", "/v1/news/n-lib-1/media", officer)).json()).media;
    assert.equal(list.length, 1);
    const served = await call("GET", `/v1/media/n-lib-1/${added.filename}`, officer);
    assert.equal(served.status, 200);
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), PNG);

    // the copy is independent: archiving the library entry does not touch the article's gallery
    assert.equal((await call("PATCH", `/v1/media-library/${asset.code}`, publisher, { status: "archived" })).status, 200);
    assert.equal((await call("GET", `/v1/media/n-lib-1/${added.filename}`, officer)).status, 200);
    assert.equal((await add(officer)).status, 400, "an archived library image can no longer be added");
  });
});
