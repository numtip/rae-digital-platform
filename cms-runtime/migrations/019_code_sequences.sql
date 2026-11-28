-- 019 — code sequences: public codes are allocated from a counter row, never from MAX(code)+1.
--
-- Why: every module's code (RAE-DC/KB/EV/CT/AN/DP/PS/MD-####) is a primary key, is printed on the
-- public site and is named in audit rows. `SELECT MAX(code)+1 ... FOR UPDATE` has two holes:
--   1. with the highest row deleted there is no row to lock, so two writers can read the same maximum;
--   2. a deleted row's code comes back, and an old audit trail then describes a new record.
-- The media library already read the audit high-water mark as a second opinion; a counter row makes
-- that guarantee uniform and independent of row deletes: it only ever moves forward.
--
-- Additive and idempotent (CREATE TABLE IF NOT EXISTS + ON DUPLICATE KEY UPDATE), so re-applying it
-- on a database that already has it is a no-op. Applied by hand with root after a dump, like 009–018.
CREATE TABLE IF NOT EXISTS code_sequences (
  entity_type VARCHAR(32) NOT NULL PRIMARY KEY,
  last_number INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at  DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed from the highest number that already exists — in the table AND in the audit trail, because a
-- row that was deleted still owns its code. GREATEST/COALESCE keeps a fresh database at 0.
INSERT INTO code_sequences (entity_type, last_number, updated_at)
SELECT 'document',
       GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM documents), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'document' AND entity_id LIKE 'RAE-DC-%'), 0)
       ), NOW()
ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM documents), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'document' AND entity_id LIKE 'RAE-DC-%'), 0)
       ));

INSERT INTO code_sequences (entity_type, last_number, updated_at)
SELECT 'knowledge',
       GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM knowledge_entries), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'knowledge' AND entity_id LIKE 'RAE-KB-%'), 0)
       ), NOW()
ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM knowledge_entries), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'knowledge' AND entity_id LIKE 'RAE-KB-%'), 0)
       ));

INSERT INTO code_sequences (entity_type, last_number, updated_at)
SELECT 'event',
       GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM events), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'event' AND entity_id LIKE 'RAE-EV-%'), 0)
       ), NOW()
ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM events), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'event' AND entity_id LIKE 'RAE-EV-%'), 0)
       ));

INSERT INTO code_sequences (entity_type, last_number, updated_at)
SELECT 'contact',
       GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM contact_messages), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'contact' AND entity_id LIKE 'RAE-CT-%'), 0)
       ), NOW()
ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM contact_messages), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'contact' AND entity_id LIKE 'RAE-CT-%'), 0)
       ));

INSERT INTO code_sequences (entity_type, last_number, updated_at)
SELECT 'announcement',
       GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM announcements), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'announcement' AND entity_id LIKE 'RAE-AN-%'), 0)
       ), NOW()
ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM announcements), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'announcement' AND entity_id LIKE 'RAE-AN-%'), 0)
       ));

INSERT INTO code_sequences (entity_type, last_number, updated_at)
SELECT 'department',
       GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM departments), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'department' AND entity_id LIKE 'RAE-DP-%'), 0)
       ), NOW()
ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM departments), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'department' AND entity_id LIKE 'RAE-DP-%'), 0)
       ));

INSERT INTO code_sequences (entity_type, last_number, updated_at)
SELECT 'personnel',
       GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM personnel), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'personnel' AND entity_id LIKE 'RAE-PS-%'), 0)
       ), NOW()
ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM personnel), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'personnel' AND entity_id LIKE 'RAE-PS-%'), 0)
       ));

-- Media keeps its existing behaviour (codes never reused) but now through the same counter.
INSERT INTO code_sequences (entity_type, last_number, updated_at)
SELECT 'media',
       GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM media_assets), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'media' AND entity_id LIKE 'RAE-MD-%'), 0)
       ), NOW()
ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, GREATEST(
         COALESCE((SELECT MAX(CAST(SUBSTRING(code, 8) AS UNSIGNED)) FROM media_assets), 0),
         COALESCE((SELECT MAX(CAST(SUBSTRING(entity_id, 8) AS UNSIGNED)) FROM audit_logs WHERE entity_type = 'media' AND entity_id LIKE 'RAE-MD-%'), 0)
       ));
