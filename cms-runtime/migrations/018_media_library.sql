-- M15 Media library: images the office keeps for reuse (figures, photos, banners). Additive; safe to apply with
-- the site running. The file bytes live on the media volume under library/<code>/, never in the database, and the
-- nightly media backup already covers that directory. Official documents are NOT stored here (ADR-0004: they stay
-- in SharePoint). Starts empty: nothing is seeded.
CREATE TABLE IF NOT EXISTS media_assets (
  code VARCHAR(16) PRIMARY KEY,
  title_th VARCHAR(200) NOT NULL,
  title_en VARCHAR(200) NOT NULL,
  alt_th VARCHAR(300) NOT NULL DEFAULT '',
  alt_en VARCHAR(300) NOT NULL DEFAULT '',
  caption_th VARCHAR(500) NOT NULL DEFAULT '',
  caption_en VARCHAR(500) NOT NULL DEFAULT '',
  filename VARCHAR(64) NOT NULL,
  mime VARCHAR(32) NOT NULL,
  bytes INT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  status VARCHAR(12) NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_media_listing (status, updated_at),
  KEY ix_media_sha (sha256)
);
