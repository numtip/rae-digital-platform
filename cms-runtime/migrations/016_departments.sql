-- M13 Departments / org structure. Additive; starts empty (the existing unit lists on the about/research/services pages are page copy and stay as they are).
-- No head-of-unit / personnel link yet: that waits for M12 (PDPA basis). Units are archived, never deleted (audit integrity).
CREATE TABLE IF NOT EXISTS departments (
  code VARCHAR(16) PRIMARY KEY,
  parent_code VARCHAR(16) NULL,
  name_th VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  description_th VARCHAR(1000) NOT NULL DEFAULT '',
  description_en VARCHAR(1000) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 100,
  status VARCHAR(12) NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_departments_parent (parent_code, sort_order)
);
