-- M12 Personnel (owner decision 2026-11-27: approved, owner holds data governance). Additive; starts empty — verified data only.
-- Public/private separation (Blueprint P8): `personnel` holds the directory fields; `personnel_private` holds ONE encrypted
-- blob (AES-256-GCM, app-level key PERSONNEL_KEY) with national id, birth date, gender, address, LINE, Facebook, personal
-- phone and the CV lists, plus a keyed hash of the national id for duplicate detection. Records are deactivated, never deleted.
CREATE TABLE IF NOT EXISTS personnel (
  code VARCHAR(16) PRIMARY KEY,
  employee_code VARCHAR(32) NULL,
  prefix_th VARCHAR(40) NOT NULL DEFAULT '',
  first_th VARCHAR(120) NOT NULL,
  last_th VARCHAR(120) NOT NULL,
  first_en VARCHAR(120) NOT NULL DEFAULT '',
  last_en VARCHAR(120) NOT NULL DEFAULT '',
  position_th VARCHAR(200) NOT NULL,
  position_en VARCHAR(200) NOT NULL DEFAULT '',
  academic_rank VARCHAR(80) NOT NULL DEFAULT '',
  level VARCHAR(80) NOT NULL DEFAULT '',
  work_group VARCHAR(120) NOT NULL DEFAULT '',
  department_code VARCHAR(16) NULL,
  email VARCHAR(254) NOT NULL DEFAULT '',
  phone_office VARCHAR(40) NOT NULL DEFAULT '',
  expertise TEXT NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  consent_at DATETIME NULL,
  consent_by VARCHAR(64) NULL,
  status VARCHAR(10) NOT NULL,
  source VARCHAR(10) NOT NULL DEFAULT 'manual',
  created_by VARCHAR(64) NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY ux_personnel_employee (employee_code),
  KEY ix_personnel_department (department_code),
  KEY ix_personnel_public (is_public, status)
);
CREATE TABLE IF NOT EXISTS personnel_private (
  personnel_code VARCHAR(16) PRIMARY KEY,
  data_enc MEDIUMTEXT NOT NULL,
  national_id_hash CHAR(64) NULL,
  updated_by VARCHAR(64) NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY ux_personnel_private_nid (national_id_hash)
);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_personnel_code VARCHAR(16) NULL;
