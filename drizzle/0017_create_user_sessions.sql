PRAGMA foreign_keys = ON;

-- New user_sessions table for storing session tokens
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
  ON user_sessions(user_id, revoked_at, expires_at);
