-- Create plugins table for storing plugin metadata and status
CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,
  plugin_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT "installed",
  manifest_json TEXT NOT NULL,
  installed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugins_plugin_id ON plugins(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugins_status ON plugins(status);

-- Create plugin_permissions table for storing plugin-specific permissions
CREATE TABLE IF NOT EXISTS plugin_permissions (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(plugin_id, permission),
  FOREIGN KEY (plugin_id) REFERENCES plugins(plugin_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_permissions_plugin_id ON plugin_permissions(plugin_id);

-- Create plugin_usage table for tracking plugin usage by users
CREATE TABLE IF NOT EXISTS plugin_usage (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  usage_type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (plugin_id) REFERENCES plugins(plugin_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usage_plugin_id ON plugin_usage(plugin_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_id ON plugin_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_plugin_user ON plugin_usage(plugin_id, user_id);
