import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mysql from "mysql2/promise";
import { addUserToRepository, createCmsServer, resetRuntime } from "../cms-runtime/server.mjs";
import { createMysqlRepository } from "../lib/cms/mysql-repository.ts";

// Database-backed checks for the media library (skipped unless RAE_CMS_DB_HOST names a database that has migration
// 018). The in-memory repository cannot show what MariaDB does with code assignment under FOR UPDATE, the unique
// primary key, or DATETIME rounding, so the repository and the HTTP lifecycle are both run against a real server.
//   RAE_CMS_DB_HOST=127.0.0.1 RAE_CMS_DB_PORT=13399 RAE_CMS_DB_NAME=… RAE_CMS_DB_USER=… RAE_CMS_DB_PASSWORD=… node --test tests/cms-media-library-db.test.mjs
const db = process.env.RAE_CMS_DB_HOST
  ? { host: process.env.RAE_CMS_DB_HOST, port: Number(process.env.RAE_CMS_DB_PORT ?? 3306), user: process.env.RAE_CMS_DB_USER ?? "", password: process.env.RAE_CMS_DB_PASSWORD ?? "", database: process.env.RAE_CMS_DB_NAME ?? "" }
  : null;
const skip = db ? false : "no database configured (RAE_CMS_DB_HOST unset)";

const asset = (n) => ({
  titleTh: "ก", titleEn: `it-media-${n}`, altTh: "", altEn: "", captionTh: "", captionEn: "", filename: `${String(n).padStart(16, "0")}.png`, mime: "image/png",
  bytes: 70, sha256: String(n).padStart(64, "0"), status: "draft", createdBy: "it-user", updatedAt: Date.now(),
});
const audit = (action) => ({ actorId: "it-user", action, entityType: "media", before: {}, after: {} });
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("repository: codes increase, rows round-trip, update changes metadata and status, audit rows are written", { skip }, async () => {
  const repository = await createMysqlRepository(db);
  const pool = await mysql.createPool({ ...db, connectionLimit: 1 });
  const made = [];
  try {
    const auditCount = async (code) => Number(((await pool.query("SELECT COUNT(*) AS n FROM audit_logs WHERE entity_type = 'media' AND entity_id = ?", [code]))[0])[0].n);
    const a = await repository.createMediaAsset(asset(1), audit("media.create"));
    const before = await auditCount(a.code); // codes restart after test rows are deleted, so earlier audit rows may share this one
    const b = await repository.createMediaAsset(asset(2), audit("media.create"));
    made.push(a.code, b.code);
    assert.match(a.code, /^RAE-MD-\d{4,}$/);
    assert.equal(Number(b.code.slice(7)), Number(a.code.slice(7)) + 1);
    const got = await repository.getMediaAsset(a.code);
    assert.equal(got?.titleEn, "it-media-1");
    assert.equal(got?.bytes, 70);
    assert.equal(got?.mime, "image/png");
    assert.equal(await repository.getMediaAsset("RAE-MD-9999"), null);
    await repository.updateMediaAsset({ ...got, altTh: "ภาพ", altEn: "image", status: "published", updatedAt: Date.now() + 1000 }, { ...audit("media.update"), entityId: a.code });
    const after = await repository.getMediaAsset(a.code);
    assert.equal(after?.status, "published");
    assert.equal(after?.altEn, "image");
    const list = await repository.listMediaAssets();
    assert.ok(list.findIndex((x) => x.code === a.code) < list.findIndex((x) => x.code === b.code), "most recently updated first");
    assert.equal(await auditCount(a.code), before + 1, "the update wrote exactly one more audit row");
    const [rows] = await pool.query("SELECT action FROM audit_logs WHERE entity_type = 'media' AND entity_id = ? ORDER BY id DESC LIMIT 2", [a.code]);
    assert.deepEqual(rows.map((r) => r.action), ["media.update", "media.create"]);
  } finally {
    for (const code of made) {
      await pool.query("DELETE FROM media_assets WHERE code = ?", [code]);
    }
    await pool.end();
    await repository.close();
  }
});

test("HTTP lifecycle over MariaDB: upload, duplicate, publish, public bytes, archive", { skip }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "rae-media-db-"));
  process.env.RAE_CMS_MEDIA_DIR = dir;
  const repository = await createMysqlRepository(db);
  const pool = await mysql.createPool({ ...db, connectionLimit: 1 });
  resetRuntime();
  await addUserToRepository(repository, { id: "it-publisher", role: "publisher", password: "publisher-password-12" });
  const server = createCmsServer({ repository });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (method, path, token, body) => fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let code;
  try {
    const token = (await (await call("POST", "/v1/login", null, { userId: "it-publisher", password: "publisher-password-12" })).json()).token;
    const made = await call("POST", "/v1/media-library", token, { titleTh: "ก", titleEn: "db lifecycle", altTh: "ภาพ", altEn: "image", status: "published", dataBase64: PNG });
    assert.equal(made.status, 201);
    const body = await made.json();
    code = body.code;
    assert.equal((await call("POST", "/v1/media-library", token, { titleTh: "ก", titleEn: "again", dataBase64: PNG })).status, 409);
    const file = await call("GET", `/v1/public/media/${code}/${body.filename}`);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get("content-type"), "image/png");
    assert.equal((await (await call("GET", "/v1/public/media")).json()).assets.some((x) => x.code === code), true);
    assert.equal((await call("PATCH", `/v1/media-library/${code}`, token, { status: "archived" })).status, 200);
    assert.equal((await call("GET", `/v1/public/media/${code}/${body.filename}`)).status, 404);
  } finally {
    delete process.env.RAE_CMS_MEDIA_DIR;
    if (code) await pool.query("DELETE FROM media_assets WHERE code = ?", [code]);
    await pool.query("DELETE FROM sessions WHERE user_id = 'it-publisher'");
    await pool.query("DELETE FROM users WHERE id = 'it-publisher'");
    await pool.end();
    await new Promise((resolve) => server.close(resolve));
    await repository.close();
  }
});
