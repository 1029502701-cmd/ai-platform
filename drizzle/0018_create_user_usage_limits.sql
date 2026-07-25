PRAGMA foreign_keys = ON;

-- Per-user daily free usage limits
CREATE TABLE IF NOT EXISTS user_usage_limits (
  user_id TEXT PRIMARY KEY NOT NULL,
  daily_free_count INTEGER NOT NULL DEFAULT 3,
  used_count INTEGER NOT NULL DEFAULT 0,
  reset_time TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Initialize reset_time for existing users (best-effort)
-- NOTE: this will not run on D1 migrations automatically in all environments; callers should ensure entries are present when needed.
