import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request as httpRequest } from "node:http";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { MAX_ARTICLE_IMAGE_BYTES, assertArticleImage, extensionFor, MediaRejected } from "../lib/cms/media.ts";

// Ordered images on an article: the validation rules, the order, the published-only surface and
// the preview page. All of it runs on the in-memory repository, so CI needs no database.

// A 1x1 PNG and a 1x1 JPEG, enough for the magic-byte check to accept them.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDU1NR4oOTo0NDU0NDX/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmAAAAP/Z",
  "base64",
);

test("only real images are accepted, with a size cap", () => {
  assert.equal(assertArticleImage(PNG.subarray(0, 8), PNG.length), "image/png");
  assert.equal(assertArticleImage(JPEG.subarray(0, 8), JPEG.length), "image/jpeg");
  assert.equal(extensionFor("image/webp"), "webp");

  assert.throws(() => assertArticleImage(PNG.subarray(0, 8), 0), MediaRejected);
  assert.throws(() => assertArticleImage(PNG.subarray(0, 8), MAX_ARTICLE_IMAGE_BYTES + 1), /larger than 8 MB/);
  assert.throws(() => assertArticleImage(Buffer.from("%PDF-1.7"), 20), /png, jpeg or webp/);
  assert.throws(() => assertArticleImage(Buffer.from("MZ\x90\x00"), 20), /executable/);
});

async function withServer(run) {
  // Tests must never write into the repository: an isolated directory per server, deleted after.
  const media = mkdtempSync(join(tmpdir(), "rae-cms-media-test-"));
  process.env.RAE_CMS_MEDIA_DIR = media;
  resetRuntime();
  addUser({ id: "author", role: "publisher", password: "author-password-12" });
  addUser({ id: "reviewer", role: "editor", password: "reviewer-password-12" });
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

test("five images keep their order, reach the export and drive the preview page", async () => {
  await withServer(async (base) => {
    const author = await login(base, "author", "author-password-12");
    const reviewer = await login(base, "reviewer", "reviewer-password-12");

    const created = await fetch(`${base}/v1/news`, {
      method: "POST",
      headers: auth(author),
      body: JSON.stringify({
        id: "media-1",
        titleTh: "ทดสอบภาพ",
        titleEn: "Image test",
        source: "https://rae.mju.ac.th/m",
        bodyTh: ["ย่อหน้าภาษาไทยหนึ่ง", "ย่อหน้าภาษาไทยสอง"],
        bodyEn: ["First English paragraph", "Second English paragraph"],
      }),
    });
    assert.equal(created.status, 201);

    for (let index = 1; index <= 5; index += 1) {
      const response = await fetch(`${base}/v1/news/media-1/media`, {
        method: "POST",
        headers: auth(author),
        body: JSON.stringify({
          dataBase64: (index % 2 ? PNG : JPEG).toString("base64"),
          captionTh: `ภาพที่ ${index}`,
          captionEn: `Photo ${index}`,
          altTh: `คำอธิบายภาพที่ ${index}`,
          altEn: `Alt text ${index}`,
        }),
      });
      assert.equal(response.status, 201, `image ${index} should be accepted`);
      const record = await response.json();
      assert.equal(record.position, index, "positions follow the upload order");
    }

    const listed = await (await fetch(`${base}/v1/news/media-1/media`, { headers: auth(author) })).json();
    assert.deepEqual(listed.media.map((item) => item.position), [1, 2, 3, 4, 5]);
    assert.equal(listed.media[4].captionEn, "Photo 5");

    // a draft's images are not readable without a token, and the preview refuses a draft
    const anonImage = await fetch(`${base}/v1/media/media-1/${listed.media[0].filename}`);
    assert.equal(anonImage.status, 404);
    assert.equal((await fetch(`${base}/preview/media-1`)).status, 404);

    // the workflow, then the same images become readable and the preview renders them
    await fetch(`${base}/v1/news/media-1/submit`, { method: "POST", headers: auth(author) });
    await fetch(`${base}/v1/news/media-1/approve`, { method: "POST", headers: auth(reviewer) });
    await fetch(`${base}/v1/news/media-1/publish`, { method: "POST", headers: auth(author) });

    const exported = await (await fetch(`${base}/v1/export`, { headers: auth(reviewer) })).json();
    const entry = exported.articles.find((article) => article.id === "media-1");
    assert.equal(entry.media.length, 5, "the export carries every image");
    assert.deepEqual(entry.media.map((item) => item.captionEn), ["Photo 1", "Photo 2", "Photo 3", "Photo 4", "Photo 5"]);

    const image = await fetch(`${base}${entry.media[0].url}`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/png");
    assert.equal((await image.arrayBuffer()).byteLength, PNG.length);

    const preview = await fetch(`${base}/preview/media-1`);
    assert.equal(preview.status, 200);
    const html = await preview.text();
    assert.equal((html.match(/<figure>/g) ?? []).length, 5, "the gallery renders all five figures");
    assert.match(html, /content="noindex, nofollow"/);
    assert.match(html, /ทดสอบภาพ/);
    const english = await (await fetch(`${base}/preview/media-1?lang=en`)).text();
    assert.match(english, /Image test/);
    assert.match(html, /ย่อหน้าภาษาไทยหนึ่ง/);
    assert.match(english, /First English paragraph/);
  });
});

test("media uploads are refused for a non-author, a locked article and bad bytes", async () => {
  await withServer(async (base) => {
    const author = await login(base, "author", "author-password-12");
    const reviewer = await login(base, "reviewer", "reviewer-password-12");
    await fetch(`${base}/v1/news`, {
      method: "POST",
      headers: auth(author),
      body: JSON.stringify({ id: "media-2", titleTh: "ก", titleEn: "A", source: "https://rae.mju.ac.th/m2" }),
    });

    const byOther = await fetch(`${base}/v1/news/media-2/media`, {
      method: "POST",
      headers: auth(reviewer),
      body: JSON.stringify({ dataBase64: PNG.toString("base64") }),
    });
    assert.equal(byOther.status, 403);

    const badBytes = await fetch(`${base}/v1/news/media-2/media`, {
      method: "POST",
      headers: auth(author),
      body: JSON.stringify({ dataBase64: Buffer.from("%PDF-1.7 not an image").toString("base64") }),
    });
    assert.equal(badBytes.status, 400);
    assert.equal((await badBytes.json()).error, "MediaRejected");

    await fetch(`${base}/v1/news/media-2/submit`, { method: "POST", headers: auth(author) });
    const locked = await fetch(`${base}/v1/news/media-2/media`, {
      method: "POST",
      headers: auth(author),
      body: JSON.stringify({ dataBase64: PNG.toString("base64") }),
    });
    assert.equal(locked.status, 400, "images are added while the article is a draft");
  });
});

test("ids and file names are validated, and an oversized upload is refused", async () => {
  await withServer(async (base) => {
    const author = await login(base, "author", "author-password-12");

    const bad = await fetch(`${base}/v1/news`, {
      method: "POST",
      headers: auth(author),
      body: JSON.stringify({ id: "../../etc/passwd", titleTh: "ก", titleEn: "a", source: "s" }),
    });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error, "INVALID_ID");

    const ok = await fetch(`${base}/v1/news`, {
      method: "POST",
      headers: auth(author),
      body: JSON.stringify({ id: "safe-id-1", titleTh: "ก", titleEn: "a", source: "s" }),
    });
    assert.equal(ok.status, 201);

    // A traversal id never reaches the filesystem: it is not a valid id, so there is nothing to serve.
    assert.equal((await fetch(`${base}/v1/media/..%2f..%2fetc`, { headers: auth(author) })).status, 404);
    // Neither does an upload whose file name is not the one the runtime generates.
    assert.equal((await fetch(`${base}/v1/media/safe-id-1/../../../etc/passwd`, { headers: auth(author) })).status, 404);
    assert.equal((await fetch(`${base}/v1/media/safe-id-1/passwd.jpg`, { headers: auth(author) })).status, 404);

    // A declared body above the cap is refused before it is buffered.
    const oversized = await new Promise((resolve, reject) => {
      const request = httpRequest(`${base}/v1/news/safe-id-1/media`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${author}`, "content-length": String(13 * 1024 * 1024) },
      }, (response) => resolve(response.statusCode));
      request.on("error", reject);
      request.end();
    });
    assert.equal(oversized, 413);
  });
});
