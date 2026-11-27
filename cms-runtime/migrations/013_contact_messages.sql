-- M07 Contact form inbox. Additive. Stores only what the sender typed plus the consent record
-- (notice version + time); no IP address, no user agent. Rows are purged after CONTACT_RETENTION_DAYS.
CREATE TABLE IF NOT EXISTS contact_messages (
  code VARCHAR(16) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  locale VARCHAR(2) NOT NULL,
  notice_version VARCHAR(32) NOT NULL,
  consented_at DATETIME NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL,
  KEY ix_contact_status (status, created_at)
);
