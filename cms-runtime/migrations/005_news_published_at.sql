-- When an article was published.
--
-- Additive and nullable: rows published before this column existed keep NULL, and the site leaves
-- the date off rather than showing the moment an export happened to be taken. The runtime sets it
-- in the workflow's publish transition; nothing derives it from an export run.

ALTER TABLE news_articles
  ADD COLUMN published_at DATETIME NULL;
