import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { createMysqlRepository } from "../lib/cms/mysql-repository.ts";

// Database-backed checks for code allocation (skipped unless RAE_CMS_DB_HOST names a database that has
// migration 019). The in-memory repository cannot show what MariaDB does with the counter row under
// concurrency, which is the whole point of the change: `MAX(code)+1 ... FOR UPDATE` has no row to lock
// when the highest row was deleted, so two writers can read the same maximum.
//   RAE_CMS_DB_HOST=127.0.0.1 RAE_CMS_DB_PORT=13399 RAE_CMS_DB_NAME=… RAE_CMS_DB_USER=… RAE_CMS_DB_PASSWORD=… \
//     node --test tests/cms-code-sequences-db.test.mjs
const db = process.env.RAE_CMS_DB_HOST
  ? {
      host: process.env.RAE_CMS_DB_HOST,
      port: Number(process.env.RAE_CMS_DB_PORT ?? 3306),
      user: process.env.RAE_CMS_DB_USER ?? "",
      password: process.env.RAE_CMS_DB_PASSWORD ?? "",
      database: process.env.RAE_CMS_DB_NAME ?? "",
    }
  : null;
const skip = db ? false : "no database configured (RAE_CMS_DB_HOST unset)";

const entry = (n) => ({
  kind: "faq",
  topic: `it-topic-${n}`,
  questionTh: `คำถาม ${n}`,
  questionEn: `question ${n}`,
  answerTh: ["คำตอบ"],
  answerEn: ["answer"],
  status: "draft",
  sortOrder: n,
  createdBy: "it-user",
  updatedAt: Date.now(),
});
const audit = (action) => ({ actorId: "it-user", action, entityType: "knowledge", before: {}, after: {} });
const numberOf = (code) => Number(code.slice(7));

test("concurrent creators never receive the same code", { skip }, async () => {
  const repository = await createMysqlRepository(db);
  const pool = await mysql.createPool({ ...db, connectionLimit: 12 });
  const made = [];
  try {
    // Eight at once: with MAX(code)+1 the first two could read the same high-water mark.
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => repository.createKnowledge(entry(i + 1), audit("knowledge.create"))),
    );
    made.push(...results.map((r) => r.code));
    assert.equal(new Set(made).size, 8, `codes collided: ${made.join(", ")}`);
    for (const code of made) assert.match(code, /^RAE-KB-\d{4,}$/);
    // The counter is monotonic, so the batch is consecutive in allocation order (order of completion may vary).
    const numbers = made.map(numberOf).sort((a, b) => a - b);
    assert.equal(numbers[numbers.length - 1] - numbers[0], 7, `expected 8 consecutive numbers, got ${numbers.join(",")}`);
  } finally {
    if (made.length) await pool.query(`DELETE FROM knowledge_entries WHERE code IN (${made.map(() => "?").join(",")})`, made);
    await pool.end();
    await repository.close(); // the repository owns its own pool; without this the process never exits
  }
});

test("a deleted row never frees its code", { skip }, async () => {
  const repository = await createMysqlRepository(db);
  const pool = await mysql.createPool({ ...db, connectionLimit: 2 });
  const made = [];
  try {
    const first = await repository.createKnowledge(entry(1), audit("knowledge.create"));
    made.push(first.code);
    const freed = numberOf(first.code);
    await pool.query("DELETE FROM knowledge_entries WHERE code = ?", [first.code]);
    const second = await repository.createKnowledge(entry(2), audit("knowledge.create"));
    made.push(second.code);
    assert.ok(
      numberOf(second.code) > freed,
      `code ${freed} came back as ${numberOf(second.code)} — a deleted row must not free its code`,
    );
  } finally {
    if (made.length) await pool.query(`DELETE FROM knowledge_entries WHERE code IN (${made.map(() => "?").join(",")})`, made);
    await pool.end();
    await repository.close();
  }
});

test("the seed takes the audit high-water mark, so an old trail cannot describe a new record", { skip }, async () => {
  const repository = await createMysqlRepository(db);
  const pool = await mysql.createPool({ ...db, connectionLimit: 2 });
  const marker = "RAE-KB-9000";
  try {
    // An audit row whose record no longer exists: exactly the case that MAX(code)+1 gets wrong.
    await pool.query(
      "INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, before_json, after_json) VALUES (UUID(), 'it-user', 'knowledge.create', 'knowledge', ?, '{}', '{}')",
      [marker],
    );
    // Re-apply the migration's seed for this entity, as a fresh database or a re-run would.
    await pool.query(
      `INSERT INTO code_sequences (entity_type, last_number, updated_at)
       SELECT 'knowledge',
              GREATEST(
                COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM knowledge_entries), 0),
                COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'knowledge' AND entity_id LIKE 'RAE-KB-%'), 0)
              ), NOW()
       ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, GREATEST(
                COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM knowledge_entries), 0),
                COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'knowledge' AND entity_id LIKE 'RAE-KB-%'), 0)
              ))`,
    );
    const made = await repository.createKnowledge(entry(3), audit("knowledge.create"));
    try {
      assert.ok(
        numberOf(made.code) > 9000,
        `allocated ${made.code} although the audit trail already named RAE-KB-9000`,
      );
    } finally {
      await pool.query("DELETE FROM knowledge_entries WHERE code = ?", [made.code]);
    }
  } finally {
    await pool.end();
    await repository.close();
  }
});
