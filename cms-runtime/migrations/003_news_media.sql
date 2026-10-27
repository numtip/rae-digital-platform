-- Ordered images for an article (M14 + M15 media scope).
--
-- Additive only: a new table, no change to the existing four. The files themselves live on the
-- dedicated media volume (RAE_CMS_MEDIA_DIR), not in the database — this table holds the
-- reference, the order and the captions/alt text in both languages.

CREATE TABLE news_media (
  id VARCHAR(64) PRIMARY KEY,
  article_id VARCHAR(64) NOT NULL,
  position INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  mime VARCHAR(64) NOT NULL,
  bytes INT NOT NULL,
  caption_th VARCHAR(500) NOT NULL DEFAULT '',
  caption_en VARCHAR(500) NOT NULL DEFAULT '',
  alt_th VARCHAR(500) NOT NULL DEFAULT '',
  alt_en VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY news_media_article_position (article_id, position),
  KEY news_media_article (article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
