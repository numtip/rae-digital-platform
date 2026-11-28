import test from "node:test";
import assert from "node:assert/strict";
import { memoryRepository, sweepSessions, startSessionSweep } from "../cms-runtime/server.mjs";
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from "../lib/cms/session.ts";

// Expired-session GC. Two clocks expire a session (30 min idle, 8 h absolute) and authorisation
// already refuses an expired one, so the sweep may only delete rows that are past an expiry — an
// active session must survive untouched. The database variant runs only when RAE_CMS_DB_HOST is set,
// because the in-memory map cannot show what the DELETE does with real DATETIME columns.
const db = process.env.RAE_CMS_DB_HOST
  ? {
      host: process.env.RAE_CMS_DB_HOST,
      port: Number(process.env.RAE_CMS_DB_PORT ?? 3306),
      user: process.env.RAE_CMS_DB_USER ?? "",
      password: process.env.RAE_CMS_DB_PASSWORD ?? "",
      database: process.env.RAE_CMS_DB_NAME ?? "",
    }
  : null;
const skipDb = db ? false : "no database configured (RAE_CMS_DB_HOST unset)";

const AGED = Date.now();
const minutes = (n) => n * 60 * 1000;

// Three sessions: one alive, one idle past the idle window (but inside the absolute cap), one alive
// but created past the absolute cap — the two ways a session dies.
const cases = {
  active: { userId: "it-active", createdAt: AGED - minutes(1), lastSeenAt: AGED - minutes(1) },
  idle: { userId: "it-idle", createdAt: AGED - minutes(120), lastSeenAt: AGED - (SESSION_IDLE_MS + minutes(1)) },
  absolute: { userId: "it-absolute", createdAt: AGED - (SESSION_ABSOLUTE_MS + minutes(1)), lastSeenAt: AGED - minutes(1) },
};

test("memory: the sweep removes only sessions past an expiry and leaves the active one intact", async () => {
  const repository = memoryRepository();
  for (const [tokenHash, session] of Object.entries(cases)) await repository.saveSession(`it-${tokenHash}`, session);

  const removed = await sweepSessions(repository, { now: () => AGED });
  assert.equal(removed, 2, "the idle and absolute sessions should be gone");

  const still = await repository.getSession("it-active");
  assert.equal(still?.userId, "it-active", "an active session must not be touched");
  assert.equal(still?.lastSeenAt, cases.active.lastSeenAt, "the active session's clock must not change");
  assert.equal(await repository.getSession("it-idle"), null);
  assert.equal(await repository.getSession("it-absolute"), null);

  // A second sweep has nothing left to do: the collection is idempotent.
  assert.equal(await sweepSessions(repository, { now: () => AGED }), 0);
});

test("memory: a session that is merely old but still inside both clocks is kept", async () => {
  const repository = memoryRepository();
  const warm = { userId: "it-warm", createdAt: AGED - minutes(59), lastSeenAt: AGED - minutes(20) };
  await repository.saveSession("it-warm", warm);
  assert.equal(await sweepSessions(repository, { now: () => AGED }), 0);
  assert.equal((await repository.getSession("it-warm"))?.userId, "it-warm");
});

test("memory: the timer helper can be disabled, and stopping it clears the interval", () => {
  const repository = memoryRepository();
  const noop = startSessionSweep(repository, { intervalMs: 0 });
  assert.equal(typeof noop, "function");
  noop(); // nothing to clear, must not throw
  const stop = startSessionSweep(repository, { intervalMs: 60 * 60 * 1000, log: () => {} });
  assert.equal(typeof stop, "function");
  stop(); // leaving a live interval behind would keep the test process awake
});

test("database: the DELETE removes exactly the expired rows", { skip: skipDb }, async () => {
  const { default: mysql } = await import("mysql2/promise");
  const { createMysqlRepository } = await import("../lib/cms/mysql-repository.ts");
  // Same session timezone as the repository pool: mysql2 otherwise converts a Date with the
  // process timezone, and a row written +07:00 away would never match a UTC comparison.
  const pool = await mysql.createPool({ ...db, connectionLimit: 2, timezone: "Z" });
  const repository = await createMysqlRepository(db);
  const keys = ["it-gc-active", "it-gc-idle", "it-gc-absolute"].map((k) => k.padEnd(64, "0"));
  try {
    for (const [i, [name, session]] of Object.entries(cases).entries()) {
      const [inserted] = await pool.query(
        "INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?)",
        [
          keys[i],
          `it-gc-${name}`,
          new Date(session.createdAt),
          new Date(session.lastSeenAt),
          new Date(session.createdAt + SESSION_ABSOLUTE_MS),
        ],
      );
      assert.equal(inserted.affectedRows, 1, `failed to insert the ${name} session`);
    }
    const removed = await repository.deleteExpiredSessions(AGED);
    assert.equal(removed, 2, "the idle and absolute rows should be deleted");
    const [rows] = await pool.query("SELECT token_hash, user_id FROM sessions WHERE token_hash IN (?, ?, ?)", keys);
    assert.deepEqual(rows.map((r) => r.user_id), ["it-gc-active"], "only the active row may remain");
  } finally {
    await pool.query("DELETE FROM sessions WHERE token_hash IN (?, ?, ?)", keys);
    await pool.end();
    await repository.close();
  }
});
