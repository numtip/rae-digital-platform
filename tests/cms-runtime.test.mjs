import test from "node:test";
import assert from "node:assert/strict";
import { addUser, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";

async function withServer(run) {
  resetRuntime();
  addUser({ id: "author", role: "editor", password: "author-password-12" });
  addUser({ id: "reviewer", role: "editor", password: "reviewer-password-12" });
  addUser({ id: "publisher", role: "publisher", password: "publisher-password-12" });
  const server = createCmsServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function login(base, userId, password) {
  const response = await fetch(`${base}/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, password }),
  });
  const body = await response.json();
  return { status: response.status, token: body.token };
}

test("unauthenticated export is rejected and drafts stay out", async () => {
  await withServer(async (base) => {
    const anon = await fetch(`${base}/v1/export`);
    assert.equal(anon.status, 401);
    const bad = await login(base, "author", "wrong-password-12");
    assert.equal(bad.status, 401);
    const author = await login(base, "author", "author-password-12");
    const created = await fetch(`${base}/v1/news`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${author.token}` },
      body: JSON.stringify({
        id: "n1",
        titleTh: "ข่าว",
        titleEn: "News",
        source: "https://rae.mju.ac.th/example",
      }),
    });
    assert.equal(created.status, 201);
    const exported = await fetch(`${base}/v1/export`, {
      headers: { authorization: `Bearer ${author.token}` },
    });
    const body = await exported.json();
    assert.deepEqual(body.articles, []);
    const publish = await fetch(`${base}/v1/news/n1/publish`, {
      method: "POST",
      headers: { authorization: `Bearer ${author.token}` },
    });
    assert.equal(publish.status, 403);
    const reviewer = await login(base, "reviewer", "reviewer-password-12");
    const submitted = await fetch(`${base}/v1/news/n1/submit`, {
      method: "POST",
      headers: { authorization: `Bearer ${author.token}` },
    });
    assert.equal(submitted.status, 200);
    const approved = await fetch(`${base}/v1/news/n1/approve`, {
      method: "POST",
      headers: { authorization: `Bearer ${reviewer.token}` },
    });
    assert.equal(approved.status, 200);
    const publisher = await login(base, "publisher", "publisher-password-12");
    const published = await fetch(`${base}/v1/news/n1/publish`, {
      method: "POST",
      headers: { authorization: `Bearer ${publisher.token}` },
    });
    assert.equal(published.status, 200);
    const after = await fetch(`${base}/v1/export`, {
      headers: { authorization: `Bearer ${publisher.token}` },
    });
    const publishedBody = await after.json();
    assert.deepEqual(publishedBody.articles.map((item) => item.id), ["n1"]);
  });
});
