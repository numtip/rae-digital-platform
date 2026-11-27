import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { CmsUnavailable, publishedNews, revalidateAuthorized } from "../lib/cms/live.ts";

// The live pilot's two failure modes are the ones worth pinning down: a session that expires mid-run
// (one re-login, never a loop) and a runtime that is simply not there (a typed error the page can
// fall back from). A loopback server stands in for the CMS, which is never contacted.

const credentials = { userId: "desk-test", password: "not-a-real-password" };

const media = (id, n) => ({
  url: `/v1/media/${id}/0${n}-a1b2c3d${n}.jpg`,
  captionTh: `คำบรรยายภาพที่ ${n}`,
  captionEn: `Caption number ${n}`,
  altTh: `ภาพที่ ${n}`,
  altEn: `Photo ${n}`,
});

const article = (id, titleTh, titleEn, publishedAt) => ({
  id,
  status: "published",
  titleTh,
  titleEn,
  source: "https://example.org/news",
  bodyTh: [`${titleTh} ย่อหน้าที่หนึ่ง`, "ย่อหน้าที่สอง"],
  bodyEn: [`${titleEn} first paragraph`, "Second paragraph"],
  publishedAt,
  media: [1, 2].map((n) => media(id, n)),
});

const articles = [
  article("live-pilot-20261028", "ข่าวที่เพิ่งเผยแพร่", "Just published", "2026-10-27T18:16:32.000Z"),
  article("live-pilot-20261020", "ข่าวเก่ากว่า", "Older story", "2026-10-20T03:00:00.000Z"),
];

// Stands in for the runtime: one live token, a login counter, and a 401 for anything else.
function cmsStub({ articles: payload = articles } = {}) {
  const state = { logins: 0, exports: 0, token: "token-1" };
  const server = createServer((request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (request.method === "POST" && request.url === "/v1/login") {
      let raw = "";
      request.on("data", (chunk) => (raw += chunk));
      request.on("end", () => {
        const body = JSON.parse(raw || "{}");
        if (body.userId !== credentials.userId || body.password !== credentials.password) return send(401, { error: "UNAUTHORIZED" });
        state.logins += 1;
        state.token = `token-${state.logins}`;
        send(200, { token: state.token });
      });
      return;
    }
    if (request.method === "GET" && request.url === "/v1/export") {
      if (request.headers.authorization !== `Bearer ${state.token}`) return send(401, { error: "UNAUTHORIZED" });
      state.exports += 1;
      send(200, { articles: payload });
      return;
    }
    send(404, { error: "NOT_FOUND" });
  });
  return { server, state };
}

async function withCms(options, run) {
  const stub = cmsStub(options);
  await new Promise((resolve) => stub.server.listen(0, "127.0.0.1", resolve));
  const { port } = stub.server.address();
  const saved = { ...process.env };
  process.env.RAE_CMS_API = `http://127.0.0.1:${port}`;
  process.env.RAE_CMS_USER = credentials.userId;
  process.env.RAE_CMS_PASSWORD = credentials.password;
  try {
    return await run(stub);
  } finally {
    process.env = saved;
    await new Promise((resolve) => stub.server.close(resolve));
  }
}

test("the published set is read with one login and normalised for the reader", async () => {
  await withCms({}, async (stub) => {
    const thai = await publishedNews("th");
    const english = await publishedNews("en");

    // The session is a module-level cache: a second call reuses the token instead of logging in.
    assert.equal(stub.state.logins, 1);
    assert.equal(stub.state.exports, 2);

    // Newest first, and the label is the Bangkok calendar's (18:16 UTC is already the 28th there),
    // while the ISO stamp stays UTC for the JSON-LD.
    assert.deepEqual(thai.map((item) => item.nid), ["live-pilot-20261028", "live-pilot-20261020"]);
    assert.equal(thai[0].date, "28 ตุลาคม 2569");
    assert.equal(thai[0].dateIso, "2026-10-27T18:16:32.000Z");
    assert.equal(english[0].title, "Just published");
    assert.equal(english[0].date, "28 October 2026");

    // Bilingual gallery, and the photo is named through this app's proxy: the browser cannot reach
    // the runtime on loopback.
    assert.deepEqual(english[0].gallery[0], {
      src: "/api/news-live/media/live-pilot-20261028/01-a1b2c3d1.jpg",
      alt: "Photo 1",
      caption: "Caption number 1",
    });
    assert.equal(english[0].image.src, "/api/news-live/media/live-pilot-20261028/01-a1b2c3d1.jpg");
    assert.deepEqual(english[0].body.slice(0, 1), ["Just published first paragraph"]);
  });
});

test("an expired session is re-minted once and the call retried", async () => {
  await withCms({}, async (stub) => {
    await publishedNews("th");
    assert.equal(stub.state.logins, 1);

    // The runtime forgot the session (idle timeout): the next export is refused with 401.
    stub.state.token = "minted-elsewhere";
    const items = await publishedNews("th");
    assert.equal(items.length, 2);
    assert.equal(stub.state.logins, 2);
    assert.equal(stub.state.token, "token-2");
  });
});

test("an unreachable runtime raises the typed error instead of hanging", async () => {
  const closed = createServer(() => {});
  await new Promise((resolve) => closed.listen(0, "127.0.0.1", resolve));
  const { port } = closed.address();
  await new Promise((resolve) => closed.close(resolve));

  const saved = { ...process.env };
  process.env.RAE_CMS_API = `http://127.0.0.1:${port}`;
  process.env.RAE_CMS_USER = credentials.userId;
  process.env.RAE_CMS_PASSWORD = credentials.password;
  try {
    await assert.rejects(publishedNews("th"), (error) => {
      assert.equal(error.name, "CmsUnavailable");
      assert.ok(error instanceof CmsUnavailable);
      return true;
    });
  } finally {
    process.env = saved;
  }
});

test("a missing credential is an outage, not an unauthenticated request", async () => {
  await withCms({}, async (stub) => {
    delete process.env.RAE_CMS_PASSWORD;
    await assert.rejects(publishedNews("th"), (error) => error instanceof CmsUnavailable);
    assert.equal(stub.state.logins, 0);
  });
});

test("the revalidate hook only accepts the configured secret", () => {
  assert.equal(revalidateAuthorized(null, "s3cret"), false);
  assert.equal(revalidateAuthorized("wrong", "s3cret"), false);
  assert.equal(revalidateAuthorized("s3cret-longer", "s3cret"), false);
  assert.equal(revalidateAuthorized("s3cret", "s3cret"), true);
  // No secret configured: nothing passes, not even an empty header.
  assert.equal(revalidateAuthorized("", ""), false);
  assert.equal(revalidateAuthorized(null, undefined), false);
});
