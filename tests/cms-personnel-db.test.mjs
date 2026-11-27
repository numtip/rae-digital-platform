import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { createMysqlRepository } from "../lib/cms/mysql-repository.ts";

// Database-backed checks for the restricted personnel table (skipped unless RAE_CMS_DB_HOST names a database that has
// migration 017). Added after the live acceptance run showed what the in-memory repository cannot: a unique-key clash
// on the national-id hash must be reported as a duplicate and must never touch the other person's row.
//   RAE_CMS_DB_HOST=127.0.0.1 RAE_CMS_DB_PORT=… RAE_CMS_DB_NAME=… RAE_CMS_DB_USER=… RAE_CMS_DB_PASSWORD=… node --test tests/cms-personnel-db.test.mjs
const db = process.env.RAE_CMS_DB_HOST
  ? { host: process.env.RAE_CMS_DB_HOST, port: Number(process.env.RAE_CMS_DB_PORT ?? 3306), user: process.env.RAE_CMS_DB_USER ?? "", password: process.env.RAE_CMS_DB_PASSWORD ?? "", database: process.env.RAE_CMS_DB_NAME ?? "rae_cms" }
  : null;
const skip = db ? false : "no database configured (RAE_CMS_DB_HOST unset)";

const person = (n) => ({ employeeCode: `it-emp-${n}`, prefixTh: "", firstTh: "ก", lastTh: "ข", firstEn: "", lastEn: "", positionTh: "x", positionEn: "", academicRank: "", level: "", workGroup: "", departmentCode: null, email: "", phoneOffice: "", expertise: ["a"], isPublic: false, consentAt: null, consentBy: null, status: "active", source: "manual", createdBy: "it-user", updatedAt: Date.now() });
const audit = (code) => ({ actorId: "it-user", action: "personnel.private.write", entityType: "personnel", entityId: code, before: {}, after: {} });

test("restricted blob: insert, update in place, duplicate hash reported and the other row untouched", { skip }, async () => {
  const repository = await createMysqlRepository(db);
  const pool = await mysql.createPool({ ...db, connectionLimit: 1 });
  const made = [];
  try {
    const a = await repository.createPersonnel(person(1), { actorId: "it-user", action: "personnel.create", entityType: "personnel", before: {}, after: {} });
    const b = await repository.createPersonnel(person(2), { actorId: "it-user", action: "personnel.create", entityType: "personnel", before: {}, after: {} });
    made.push(a.code, b.code);
    assert.deepEqual(a.expertise, ["a"]);
    assert.equal((await repository.getPersonnel(a.code))?.employeeCode, "it-emp-1");
    await assert.rejects(() => repository.createPersonnel(person(1), { actorId: "it-user", action: "x", entityType: "personnel", before: {}, after: {} }), /employee code/);

    const H = "a".repeat(64);
    assert.equal(await repository.savePersonnelPrivate(a.code, "v1:AAAA", H, "it-user", 1000, audit(a.code)), "ok");
    assert.equal(await repository.savePersonnelPrivate(a.code, "v1:BBBB", H, "it-user", 2000, audit(a.code)), "ok", "the same person may rewrite their own row");
    assert.equal((await repository.getPersonnelPrivate(a.code))?.dataEnc, "v1:BBBB");

    assert.equal(await repository.savePersonnelPrivate(b.code, "v1:CCCC", H, "it-user", 3000, audit(b.code)), "duplicate", "another person cannot take the same national id");
    assert.equal((await repository.getPersonnelPrivate(a.code))?.dataEnc, "v1:BBBB", "A's row was not overwritten by B's attempt");
    assert.equal(await repository.getPersonnelPrivate(b.code), null, "B has no row");
    assert.equal(await repository.savePersonnelPrivate(b.code, "v1:DDDD", "b".repeat(64), "it-user", 4000, audit(b.code)), "ok");
  } finally {
    for (const code of made) {
      await pool.query("DELETE FROM personnel_private WHERE personnel_code = ?", [code]);
      await pool.query("DELETE FROM personnel WHERE code = ?", [code]);
    }
    await pool.end();
    await repository.close();
  }
});
