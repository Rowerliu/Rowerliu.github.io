CREATE TABLE IF NOT EXISTS visitor_locations (
  id TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  visits INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_visitors (
  visitor_hash TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  PRIMARY KEY (visitor_hash, visit_date)
);

CREATE INDEX IF NOT EXISTS visitor_locations_last_seen
  ON visitor_locations (last_seen DESC);

CREATE INDEX IF NOT EXISTS daily_visitors_date
  ON daily_visitors (visit_date);
