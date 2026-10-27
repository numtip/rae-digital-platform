import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { createMysqlRepository } from "../lib/cms/mysql-repository.ts";
import { addUserToRepository, createCmsServer } from "../cms-runtime/server.mjs";

// Integration tests against the isolated rae_cms database. They run only when the environment
// names it (RAE_CMS_DB_HOST …), so `npm test` in CI stays green without a database:
//
//   set -a; . ~/.config/rae-cms/db-env; set +a
//   RAE_CMS_DB_HOST=127.0.0.1 RAE_CMS_DB_PORT=13306 RAE_CMS_DB_NAME=$MARIADB_DATABASE \
//   RAE_CMS_DB_USER=$MARIADB_USER RAE_CMS_DB_PASSWORD=$MARIADB_PASSWORD \
//   node --test tests/cms-repository.test.mjs
//
// Every row this file writes starts with `it-` and is deleted afterwards; the database is
// otherwise left exactly as it was found.

const db = process.env.RAE_CMS_DB_HOST
  ? {
      host: process.env.RAE_CMS_DB_HOST,
      port: Number(process.env.RAE_CMS_DB_PORT ?? 3306),
      user: process.env.RAE_CMS_DB_USER ?? "",
      password: process.env.RAE_CMS_DB_PASSWORD ?? "",
      database: process.env.RAE_CMS_DB_NAME ?? "rae_cms",
    }
  : null;

const skip = db ? false : "no database configured (RAE_CMS_DB_HOST unset)";
const PREFIX = "it-";

// Straight SQL for the teardown: the repository has no delete by design, and a test should not
// grow the production surface just to clean up after itself.
async function purge() {
  const pool = await mysql.createPool({ ...db, connectionLimit: 1 });
  try {
    await pool.query("DELETE FROM news_articles WHERE id LIKE ?", [`${PREFIX}%`]);
    await pool.query("DELETE FROM sessions WHERE user_id LIKE ?", [`${PREFIX}%`]);
    await pool.query("DELETE FROM audit_logs WHERE actor_id LIKE ?", [`${PREFIX}%`]);
    await pool.query("DELETE FROM users WHERE id LIKE ?", [`${PREFIX}%`]);
  } finally {
    await pool.end();
  }
}

test("repository reads and writes through the database", { skip }, async () => {
  const repository = await createMysqlRepository(db);
  try {
    await repository.addUser({ id: `${PREFIX}user`, role: "officer", passwordHash: "salt:hash" });
    const user = await repository.findUser(`${PREFIX}user`);
    assert.equal(user?.role, "officer");
    assert.equal(user?.passwordHash, "salt:hash");

    const now = 1_700_000_000_000;
    await repository.saveSession(`${PREFIX}token`, { userId: `${PREFIX}user`, createdAt: now, lastSeenAt: now });
    assert.deepEqual(await repository.getSession(`${PREFIX}token`), {
      userId: `${PREFIX}user`,
      createdAt: now,
      lastSeenAt: now,
    });

    await repository.touchSession(`${PREFIX}token`, now + 60_000);
    assert.equal((await repository.getSession(`${PREFIX}token`))?.lastSeenAt, now + 60_000);

    await repository.saveArticle({
      id: `${PREFIX}article`,
      status: "draft",
      pinned: false,
      authorId: `${PREFIX}user`,
      titleTh: "ทดสอบ",
      titleEn: "Test",
      source: "https://rae.mju.ac.th/test",
    });
    const article = await repository.getArticle(`${PREFIX}article`);
    assert.equal(article?.titleEn, "Test");
    assert.equal(article?.pinned, false);

    await repository.appendAudit({
      actorId: `${PREFIX}user`,
      action: "news.draft",
      entityType: "news",
      entityId: `${PREFIX}article`,
    });
    const audit = await repository.listAudit();
    assert.ok(audit.some((entry) => entry.action === "news.draft" && entry.entityId === `${PREFIX}article`));
  } finally {
    await repository.close();
    await purge();
  }
});

test("records survive a fresh repository (the runtime restart case)", { skip }, async () => {
  const first = await createMysqlRepository(db);
  try {
    await first.saveArticle({
      id: `${PREFIX}persist`,
      status: "review",
      pinned: false,
      authorId: `${PREFIX}user`,
      titleTh: "คงอยู่",
      titleEn: "Persists",
      source: "https://rae.mju.ac.th/persist",
      revisionReason: "ขอแหล่งอ้างอิง",
      returnedBy: `${PREFIX}reviewer`,
    });
  } finally {
    await first.close();
  }

  // A new pool and a new object graph: nothing is left in memory to fall back on.
  const second = await createMysqlRepository(db);
  try {
    const article = await second.getArticle(`${PREFIX}persist`);
    assert.equal(article?.status, "review");
    assert.equal(article?.revisionReason, "ขอแหล่งอ้างอิง");
    assert.equal(article?.returnedBy, `${PREFIX}reviewer`);
  } finally {
    await second.close();
    await purge();
  }
});

test("the whole workflow persists through the HTTP runtime", { skip }, async () => {
  const repository = await createMysqlRepository(db);
  const server = createCmsServer({ repository });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const auth = (token) => ({ "content-type": "application/json", authorization: `Bearer ${token}` });

  try {
    await addUserToRepository(repository, { id: `${PREFIX}officer`, role: "officer", password: "officer-password-12" });
    await addUserToRepository(repository, { id: `${PREFIX}reviewer`, role: "editor", password: "reviewer-password-12" });
    await addUserToRepository(repository, { id: `${PREFIX}publisher`, role: "publisher", password: "publisher-password-12" });

    const login = async (userId, password) => {
      const response = await fetch(`${base}/v1/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      return (await response.json()).token;
    };
    const officer = await login(`${PREFIX}officer`, "officer-password-12");
    const reviewer = await login(`${PREFIX}reviewer`, "reviewer-password-12");
    const publisher = await login(`${PREFIX}publisher`, "publisher-password-12");
    assert.ok(officer && reviewer && publisher, "all three accounts must be able to log in");

    const created = await fetch(`${base}/v1/news`, {
      method: "POST",
      headers: auth(officer),
      body: JSON.stringify({ id: `${PREFIX}n1`, titleTh: "ข่าวทดสอบ", titleEn: "Test news", source: "https://rae.mju.ac.th/it" }),
    });
    assert.equal(created.status, 201);

    assert.equal((await fetch(`${base}/v1/news/${PREFIX}n1/submit`, { method: "POST", headers: auth(officer) })).status, 200);
    const returned = await fetch(`${base}/v1/news/${PREFIX}n1/return`, {
      method: "POST",
      headers: auth(reviewer),
      body: JSON.stringify({ reason: "ขอภาพประกอบ" }),
    });
    assert.equal(returned.status, 200);
    assert.equal((await returned.json()).status, "draft");

    const edited = await fetch(`${base}/v1/news/${PREFIX}n1`, {
      method: "PATCH",
      headers: auth(officer),
      body: JSON.stringify({ titleEn: "Test news, revised" }),
    });
    assert.equal(edited.status, 200);

    assert.equal((await fetch(`${base}/v1/news/${PREFIX}n1/submit`, { method: "POST", headers: auth(officer) })).status, 200);
    assert.equal((await fetch(`${base}/v1/news/${PREFIX}n1/approve`, { method: "POST", headers: auth(reviewer) })).status, 200);

    const beforePublish = await (await fetch(`${base}/v1/export`, { headers: auth(reviewer) })).json();
    // Scoped to this test's own id: the database may legitimately hold real published articles.
    assert.deepEqual(
      beforePublish.articles.filter((item) => item.id === `${PREFIX}n1`),
      [],
      "an approved item is not published yet",
    );

    const published = await fetch(`${base}/v1/news/${PREFIX}n1/publish`, { method: "POST", headers: auth(publisher) });
    assert.equal(published.status, 200);

    const afterPublish = await (await fetch(`${base}/v1/export`, { headers: auth(reviewer) })).json();
    assert.deepEqual(
      afterPublish.articles.filter((item) => item.id.startsWith(PREFIX)).map((item) => item.id),
      [`${PREFIX}n1`],
      "only the published item is exported",
    );

    // The session survives a new server object because it lives in the database.
    const freshRepository = await createMysqlRepository(db);
    const restarted = createCmsServer({ repository: freshRepository });
    await new Promise((resolve) => restarted.listen(0, "127.0.0.1", resolve));
    const restartedBase = `http://127.0.0.1:${restarted.address().port}`;
    try {
      const stillIn = await fetch(`${restartedBase}/v1/news`, { headers: auth(officer) });
      assert.equal(stillIn.status, 200, "the session token is still valid after a restart");
      const articles = await (await stillIn.json()).articles;
      // publishedAt survives the pool: it is a column, not something rebuilt on read.
      assert.ok(
        articles.some(
          (item) =>
            item.id === `${PREFIX}n1` &&
            item.status === "published" &&
            /^\d{4}-\d{2}-\d{2}T/.test(item.publishedAt ?? ""),
        ),
        "the publication date is persisted",
      );
    } finally {
      await new Promise((resolve) => restarted.close(resolve));
      await freshRepository.close();
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await repository.close();
    await purge();
  }
});
