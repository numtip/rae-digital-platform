-- Article text in both languages.
--
-- Until now the runtime carried only titles, so the desk could not hold a story. Additive and
-- nullable: existing rows keep working, and the static site keeps reading its own content files
-- until the export import exists.

ALTER TABLE news_articles
  ADD COLUMN body_th MEDIUMTEXT NULL,
  ADD COLUMN body_en MEDIUMTEXT NULL;
