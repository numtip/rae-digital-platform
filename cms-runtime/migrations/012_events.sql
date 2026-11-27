-- M05 Events / calendar. Additive; safe to apply with the site running. Starts empty: no events are seeded.
CREATE TABLE IF NOT EXISTS events (
  code VARCHAR(16) PRIMARY KEY,
  title_th VARCHAR(300) NOT NULL,
  title_en VARCHAR(300) NOT NULL,
  description_th TEXT NOT NULL,
  description_en TEXT NOT NULL,
  location_th VARCHAR(200) NOT NULL DEFAULT '',
  location_en VARCHAR(200) NOT NULL DEFAULT '',
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NULL,
  status VARCHAR(12) NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_events_listing (status, starts_at)
);
