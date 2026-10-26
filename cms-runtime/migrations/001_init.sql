-- Isolated CMS schema. Apply only to a disposable database, never attendance MariaDB.

CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL
);

CREATE TABLE sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL
);

CREATE TABLE audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE news_articles (
  id VARCHAR(64) PRIMARY KEY,
  status VARCHAR(32) NOT NULL,
  pinned TINYINT NOT NULL DEFAULT 0,
  author_id VARCHAR(64) NOT NULL,
  reviewer_id VARCHAR(64) NULL,
  publisher_id VARCHAR(64) NULL,
  title_th VARCHAR(500) NOT NULL,
  title_en VARCHAR(500) NOT NULL,
  source VARCHAR(1000) NOT NULL
);
