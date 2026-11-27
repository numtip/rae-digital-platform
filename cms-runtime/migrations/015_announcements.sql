-- M17 Announcements (banner / popup / ticker). Additive; starts empty. Schedule and expiry are enforced by the public endpoint.
CREATE TABLE IF NOT EXISTS announcements (
  code VARCHAR(16) PRIMARY KEY,
  kind VARCHAR(8) NOT NULL,
  title_th VARCHAR(200) NOT NULL,
  title_en VARCHAR(200) NOT NULL,
  body_th VARCHAR(600) NOT NULL DEFAULT '',
  body_en VARCHAR(600) NOT NULL DEFAULT '',
  link_url VARCHAR(500) NOT NULL DEFAULT '',
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  status VARCHAR(12) NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_announcements_live (status, starts_at, ends_at)
);
