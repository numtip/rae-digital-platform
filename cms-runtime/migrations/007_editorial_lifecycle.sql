-- Editorial lifecycle: taking a published article down, and revising one without taking it down.
--
-- Additive and nullable, so existing rows keep working. `published_snapshot` holds the export
-- projection of the last publication as JSON: while an item sits in `revision` the export serves
-- that snapshot, so a correction is never visible before it is approved. Rows published before
-- this migration carry NULL and the runtime freezes their live body the first time they are
-- revised. `revision_no` counts publications (1 at the first release, +1 per republication).

ALTER TABLE news_articles
  ADD COLUMN withdrawn_at DATETIME NULL,
  ADD COLUMN withdrawn_by VARCHAR(64) NULL,
  ADD COLUMN withdrawal_reason VARCHAR(1000) NULL,
  ADD COLUMN revision_no INT NOT NULL DEFAULT 0,
  ADD COLUMN published_snapshot MEDIUMTEXT NULL;
