-- M08 first-party, cookieless analytics: anonymous page-view counts per day and path. No IP, no user agent,
-- no identifier of any kind is stored. Additive; the feature is off unless ANALYTICS_ENABLED=true.
CREATE TABLE IF NOT EXISTS analytics_daily (
  day DATE NOT NULL,
  path VARCHAR(120) NOT NULL,
  hits INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
);
