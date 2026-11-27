-- M03 Document Center registry (ADR-0004: files stay in Microsoft 365; metadata + validated link only).
-- Additive. Safe to apply with the site running; nothing existing is altered.
CREATE TABLE IF NOT EXISTS documents (
  code VARCHAR(16) PRIMARY KEY,
  category VARCHAR(32) NOT NULL,
  title_th VARCHAR(300) NOT NULL,
  title_en VARCHAR(300) NOT NULL,
  doc_type VARCHAR(16) NOT NULL,
  version VARCHAR(16) NOT NULL,
  status VARCHAR(12) NOT NULL,
  visibility VARCHAR(12) NOT NULL,
  storage_url VARCHAR(1000) NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  created_by VARCHAR(64) NOT NULL,
  updated_at DATETIME NOT NULL,
  download_count INT NOT NULL DEFAULT 0,
  KEY ix_documents_listing (status, visibility, category)
);
CREATE TABLE IF NOT EXISTS document_versions (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(16) NOT NULL,
  version VARCHAR(16) NOT NULL,
  storage_url VARCHAR(1000) NOT NULL,
  changed_by VARCHAR(64) NOT NULL,
  changed_at DATETIME NOT NULL,
  change_note VARCHAR(500) NOT NULL DEFAULT '',
  KEY ix_document_versions_code (code)
);
