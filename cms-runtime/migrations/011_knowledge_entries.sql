-- M04 Knowledge / FAQ entries. Additive; safe to apply with the site running. Starts empty: no content is seeded.
CREATE TABLE IF NOT EXISTS knowledge_entries (
  code VARCHAR(16) PRIMARY KEY,
  kind VARCHAR(12) NOT NULL DEFAULT 'faq',
  topic VARCHAR(80) NOT NULL DEFAULT '',
  question_th VARCHAR(300) NOT NULL,
  question_en VARCHAR(300) NOT NULL,
  answer_th TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  status VARCHAR(12) NOT NULL,
  sort_order INT NOT NULL DEFAULT 100,
  created_by VARCHAR(64) NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_knowledge_listing (status, kind, sort_order)
);
