PRAGMA foreign_keys = ON;

-- Add WeChat and guest auth fields to users table
ALTER TABLE users RENAME TO users_old;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  -- legacy fields kept for compatibility
  email TEXT COLLATE NOCASE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  -- new auth fields
  openid TEXT,
  unionid TEXT,
  nickname TEXT,
  avatar TEXT,
  type TEXT NOT NULL DEFAULT 'guest' CHECK (type IN ('guest', 'wechat')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted', 'merged')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Copy data from old table keeping existing columns where possible
INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at)
SELECT id, email, password_hash, role, status, created_at, updated_at FROM users_old;

DROP TABLE IF EXISTS users_old;

-- Add indexes for openid/unionid
CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid);
CREATE INDEX IF NOT EXISTS idx_users_unionid ON users(unionid);
