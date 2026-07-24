-- drizzle migration: 0004_user_settings.sql
-- Creates user_settings table to store per-user JSON settings

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY NOT NULL,
  settings_json TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

-- NOTE: If later you need to query by specific settings fields, add separate columns or create indexes in a future migration.
