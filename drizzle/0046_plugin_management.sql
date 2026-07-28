-- drizzle migration: 0046_plugin_management.sql
-- Adds plugin management tables: plugin_versions, plugin_installations, plugin_reviews

CREATE TABLE IF NOT EXISTS plugin_versions (
  id TEXT PRIMARY KEY NOT NULL,
  plugin_id TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'released', 'deprecated', 'unreleased')),
  release_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plugin_versions_plugin_id ON plugin_versions(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_versions_version ON plugin_versions(version);
CREATE INDEX IF NOT EXISTS idx_plugin_versions_status ON plugin_versions(status);

CREATE TABLE IF NOT EXISTS plugin_installations (
  id TEXT PRIMARY KEY NOT NULL,
  plugin_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('installing', 'installed', 'uninstalling', 'installed_failed', 'pending')),
  installed_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plugin_installations_plugin_id ON plugin_installations(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_installations_user_id ON plugin_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_installations_status ON plugin_installations(status);

CREATE TABLE IF NOT EXISTS plugin_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  plugin_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plugin_reviews_plugin_id ON plugin_reviews(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_reviews_user_id ON plugin_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_reviews_rating ON plugin_reviews(rating);
