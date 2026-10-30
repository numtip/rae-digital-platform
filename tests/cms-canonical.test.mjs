import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { liveNews, liveSitemap, mergedNews, publishedNews, readWithdrawn, revalidateAuthorized } from "../lib/cms/live.ts";
import { cmsArticle, publishedIds } from "../lib/cms/published-site.ts";
import { rememberWithdrawn, withdrawnIds } from "../lib/cms/withdrawn.ts";

// The two promises this PR makes, pinned down without a CMS and without a network:
//   1. /news/ lists one card per id — the archive and the published set, newest first.
//   2. A story the publish hook reported withdrawn cannot come back. Not through the committed
//      fallback copy an outage serves, not through the sitemap, not through the static params the
//      Pages export bakes. The tombstone is the file, so it outlives the process and the outage.

// The site's own committed copy is the fallback fixture: it is what an outage actually serves.
const committed = JSON.parse(readFileSync("public/cms-published/index.json", "utf8")).articles.map((a) => a.id);

// The runtime is unreachable for every test here: no credentials, and a port nothing listens on.
// `fetch` is stubbed as well, so a code path that reached for the network would fail loudly here
// instead of quietly depending on it.
async function apiDown(run) {
  const dir = mkdtempSync(join(tmpdir(), "rae-cms-canonical-"));
  const saved = { ...process.env };
  const realFetch = globalThis.fetch;
  process.env.RAE_CMS_API = "http://127.0.0.1:1";
  process.env.RAE_CMS_DATA_DIR = dir;
  delete process.env.RAE_CMS_USER;
  delete process.env.RAE_CMS_PASSWORD;
  globalThis.fetch = () => {
    throw new Error("the outage fallback must not reach the network");
  };
  try {
    return await run(dir);
  } finally {
    globalThis.fetch = realFetch;
    process.env = saved;
    rmSync(dir, { recursive: true, force: true });
  }
}

const item = (nid, dateIso, title = nid) => ({ nid, title, date: "", dateIso, type: "", body: [], image: null });

test("a withdrawn id is dropped from the live export too, not only from the fallback", async () => {
  // Found in the server run: the CMS can still export the story after the office took it down, so
  // filtering only the committed fallback left the detail page answering 200 right after the hook.
  const article = (id) => ({
    id,
    status: "published",
    titleTh: "ข่าว",
    titleEn: "Story",
    source: "https://example.org/",
    bodyTh: ["เนื้อหา"],
    bodyEn: ["Body"],
    media: [],
    publishedAt: "2026-10-27T18:16:32.000Z",
  });
  const server = createServer((request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (request.method === "POST" && request.url === "/v1/login") {
      request.resume();
      return request.on("end", () => send(200, { token: "token-1" }));
    }
    if (request.method === "GET" && request.url === "/v1/export") return send(200, { articles: [article("still-live"), article("taken-down")] });
    send(404, {});
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const dir = mkdtempSync(join(tmpdir(), "rae-cms-live-withdrawn-"));
  const saved = { ...process.env };
  process.env.RAE_CMS_API = `http://127.0.0.1:${server.address().port}`;
  process.env.RAE_CMS_USER = "desk-test";
  process.env.RAE_CMS_PASSWORD = "not-a-real-password";
  process.env.RAE_CMS_DATA_DIR = dir;
  try {
    const before = await publishedNews("th");
    assert.deepEqual(before.map((entry) => entry.nid), ["still-live", "taken-down"]);

    rememberWithdrawn(["taken-down"]);
    const { items, stale } = await liveNews("th");
    assert.equal(stale, false, "the API answered, so this is not the fallback path");
    assert.deepEqual(items.map((entry) => entry.nid), ["still-live"]);
  } finally {
    process.env = saved;
    rmSync(dir, { recursive: true, force: true });
    await new Promise((resolve) => server.close(resolve));
  }
});

test("the outage fallback is the committed copy with the tombstones taken out", async () => {
  assert.ok(committed.length > 0, "fixture: the repo commits at least one published CMS article");
  await apiDown(async () => {
    const before = await liveNews("th");
    assert.equal(before.stale, true);
    assert.deepEqual(before.items.map((entry) => entry.nid).sort(), [...committed].sort());

    // The story was published and then taken down, while the sync that commits the copy never ran:
    // exactly the case where an outage used to resurrect it.
    rememberWithdrawn([committed[0]]);

    const after = await liveNews("th");
    assert.equal(after.stale, true);
    assert.deepEqual(after.items.map((entry) => entry.nid), committed.slice(1));
    // The other two paths that read the same file obey it too: the prerendered detail route and
    // the ids the static export bakes.
    assert.equal(cmsArticle("th", committed[0]), null);
    assert.deepEqual(publishedIds(), committed.slice(1));
  });
});

test("a tombstone survives a fresh module load, and batches merge", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rae-cms-withdrawn-"));
  const saved = process.env.RAE_CMS_DATA_DIR;
  process.env.RAE_CMS_DATA_DIR = dir;
  try {
    assert.equal(rememberWithdrawn(["withdrawn-first"]), 1);
    assert.equal(rememberWithdrawn(["withdrawn-second", "withdrawn-first"]), 1);

    // A restart (or a second worker) has no memory of the hook: the file is the whole truth.
    const reload = await import(`../lib/cms/withdrawn.ts?reload=${Date.now()}`);
    assert.equal(reload.isWithdrawn("withdrawn-first"), true);
    assert.equal(reload.isWithdrawn("withdrawn-second"), true);
    assert.deepEqual(
      JSON.parse(readFileSync(join(dir, "withdrawn.json"), "utf8")),
      ["withdrawn-first", "withdrawn-second"],
    );
    assert.deepEqual([...withdrawnIds()].sort(), ["withdrawn-first", "withdrawn-second"]);
  } finally {
    if (saved === undefined) delete process.env.RAE_CMS_DATA_DIR;
    else process.env.RAE_CMS_DATA_DIR = saved;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the hook refuses a bad secret and a malformed body before anything is recorded", () => {
  assert.equal(revalidateAuthorized("wrong", "s3cret"), false);
  assert.equal(revalidateAuthorized(null, "s3cret"), false);
  // No secret configured: the hook is closed, not open.
  assert.equal(revalidateAuthorized("", undefined), false);
  assert.equal(revalidateAuthorized("s3cret", "s3cret"), true);

  // A ping with no body is valid; a withdrawal notice is only valid in one shape.
  assert.deepEqual(readWithdrawn(""), { ok: true, ids: [] });
  assert.deepEqual(readWithdrawn("  "), { ok: true, ids: [] });
  assert.deepEqual(readWithdrawn('{"published":["a-b"]}'), { ok: true, ids: [] });
  assert.deepEqual(readWithdrawn('{"withdrawn":["a-b","c-d"]}'), { ok: true, ids: ["a-b", "c-d"] });
  for (const raw of [
    "not json",
    "[]",
    "null",
    '"a-b"',
    '{"withdrawn":"a-b"}',
    '{"withdrawn":["a-b",42]}',
    '{"withdrawn":["../../etc/passwd"]}',
    '{"withdrawn":["UPPER"]}',
    `{"withdrawn":[${Array.from({ length: 101 }, (_, n) => `"id-${n}"`).join(",")}]}`,
  ]) {
    assert.deepEqual(readWithdrawn(raw), { ok: false }, `accepted ${raw}`);
  }
});

test("the canonical list is one card per id, newest first, live winning a collision", () => {
  const merged = mergedNews(
    [item("38764", "2026-10-06"), item("shared-id", "2026-09-01", "archive copy")],
    [item("live-new", "2026-10-27T18:16:32.000Z"), item("shared-id", "2026-09-01", "cms copy")],
  );
  assert.deepEqual(merged.map((entry) => entry.nid), ["live-new", "38764", "shared-id"]);
  // The CMS is what the office published; the archive is the transcription of it.
  assert.equal(merged.find((entry) => entry.nid === "shared-id").title, "cms copy");
  // Nothing appears twice, whatever the mixing of full ISO instants and plain days.
  assert.equal(new Set(merged.map((entry) => entry.nid)).size, merged.length);
});

test("the sitemap lists both languages of every published id, and none of the withdrawn ones", async () => {
  await apiDown(async () => {
    const { items } = await liveNews("th");
    const entries = liveSitemap(items, new Set(), "https://example.org/site");
    assert.equal(entries.length, items.length * 2);
    for (const entry of entries) {
      assert.match(entry.url, /^https:\/\/example\.org\/site\/(th|en)\/news\/[a-z0-9-]+\/$/);
      assert.deepEqual(Object.keys(entry.alternates.languages).sort(), ["en", "th", "x-default"]);
    }
    // An id the archive already lists is not listed twice.
    const shared = liveSitemap(items, new Set([items[0].nid]), "https://example.org/site");
    assert.equal(shared.length, (items.length - 1) * 2);

    // Withdrawn: gone from the sitemap while the API is still down, because the fallback the
    // sitemap reads is already filtered.
    rememberWithdrawn([items[0].nid]);
    const { items: after } = await liveNews("th");
    assert.equal(liveSitemap(after, new Set(), "https://example.org/site").length, (items.length - 1) * 2);
  });
});
