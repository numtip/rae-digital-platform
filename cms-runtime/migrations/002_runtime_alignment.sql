-- Aligns the schema with the merged runtime in cms-runtime/server.mjs.
--
-- The runtime is still in-memory (Map-backed); this migration only removes the columns it
-- cannot supply, so a future repository layer can persist the same records without the code
-- growing fields it has no source for. Apply after 001_init.sql, to the isolated RAE CMS
-- database only — never to the attendance database.

-- The runtime's users carry id, role and a password hash; e-mail is not part of its model.
ALTER TABLE users MODIFY email VARCHAR(255) NULL;

-- The runtime appends { actorId, action, entityId }. The remaining audit columns are
-- required by the table, so they take defaults until the repository layer fills them.
-- (001_init.sql has no request_id column; the Prisma model does, which is why the two are
-- not identical — the SQL file is what is applied.)
ALTER TABLE audit_logs
  MODIFY entity_type VARCHAR(64) NOT NULL DEFAULT '',
  MODIFY before_json TEXT NOT NULL DEFAULT '',
  MODIFY after_json TEXT NOT NULL DEFAULT '',
  MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Sessions: expires_at is derived from created_at (8 h absolute) by lib/cms/session.ts, so a
-- repository layer writes it explicitly; the default only keeps the column insertable.
ALTER TABLE sessions MODIFY expires_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
