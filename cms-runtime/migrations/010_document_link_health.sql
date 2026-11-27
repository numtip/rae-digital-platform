-- M03: link health of each registered file (ADR-0004: links can rot; the registry says so).
ALTER TABLE documents
  ADD COLUMN link_status VARCHAR(12) NULL,
  ADD COLUMN link_checked_at DATETIME NULL;
