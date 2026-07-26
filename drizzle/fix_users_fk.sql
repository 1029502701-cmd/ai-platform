PRAGMA foreign_keys = OFF;

-- Fix all tables that reference users_old -> users

-- 1. auth_sessions
CREATE TABLE IF NOT EXISTS auth_sessions_fix (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  session_version INTEGER NOT NULL DEFAULT 1 CHECK (session_version > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_seen_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT OR REPLACE INTO auth_sessions_fix SELECT * FROM auth_sessions;
DROP TABLE auth_sessions;
ALTER TABLE auth_sessions_fix RENAME TO auth_sessions;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, revoked_at, expires_at);

-- 2. conversations
CREATE TABLE IF NOT EXISTS conversations_fix (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT OR REPLACE INTO conversations_fix SELECT * FROM conversations;
DROP TABLE conversations;
ALTER TABLE conversations_fix RENAME TO conversations;
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);

-- 3. messages (FK to conversations, OK)
-- (no FK to users_old, skip)

-- 4. ai_jobs
CREATE TABLE IF NOT EXISTS ai_jobs_fix (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  conversation_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  provider TEXT,
  input_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(input_json)),
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  error_code TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);
INSERT OR REPLACE INTO ai_jobs_fix SELECT * FROM ai_jobs;
DROP TABLE ai_jobs;
ALTER TABLE ai_jobs_fix RENAME TO ai_jobs;
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_created ON ai_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_created ON ai_jobs(status, created_at ASC);

-- 5. beauty_profiles
CREATE TABLE IF NOT EXISTS beauty_profiles_fix (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  current_face_shape TEXT,
  current_eye_shape TEXT,
  skin_info TEXT,
  preferred_style TEXT,
  favorite_colors TEXT,
  analysis_count INTEGER NOT NULL DEFAULT 0,
  last_analysis_id TEXT REFERENCES beauty_reports(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT OR REPLACE INTO beauty_profiles_fix SELECT * FROM beauty_profiles;
DROP TABLE beauty_profiles;
ALTER TABLE beauty_profiles_fix RENAME TO beauty_profiles;

-- 6. beauty_analysis_history
CREATE TABLE IF NOT EXISTS beauty_analysis_history_fix (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  report_id TEXT REFERENCES beauty_reports(id) ON DELETE SET NULL,
  image_url TEXT,
  face_analysis_json TEXT,
  style_result TEXT,
  created_at TEXT NOT NULL
);
INSERT OR REPLACE INTO beauty_analysis_history_fix SELECT * FROM beauty_analysis_history;
DROP TABLE beauty_analysis_history;
ALTER TABLE beauty_analysis_history_fix RENAME TO beauty_analysis_history;

-- 7. user_sessions
CREATE TABLE IF NOT EXISTS user_sessions_fix (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT OR REPLACE INTO user_sessions_fix SELECT * FROM user_sessions;
DROP TABLE user_sessions;
ALTER TABLE user_sessions_fix RENAME TO user_sessions;

-- 8. user_usage_limits
CREATE TABLE IF NOT EXISTS user_usage_limits_fix (
  user_id TEXT PRIMARY KEY NOT NULL,
  daily_free_count INTEGER NOT NULL DEFAULT 3,
  used_count INTEGER NOT NULL DEFAULT 0,
  reset_time TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT OR REPLACE INTO user_usage_limits_fix SELECT * FROM user_usage_limits;
DROP TABLE user_usage_limits;
ALTER TABLE user_usage_limits_fix RENAME TO user_usage_limits;

-- 9. beauty_reports
CREATE TABLE IF NOT EXISTS beauty_reports_fix (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  report_json TEXT,
  share_image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT OR REPLACE INTO beauty_reports_fix SELECT * FROM beauty_reports;
DROP TABLE beauty_reports;
ALTER TABLE beauty_reports_fix RENAME TO beauty_reports;
CREATE INDEX IF NOT EXISTS idx_beauty_reports_user_id ON beauty_reports(user_id);

PRAGMA foreign_keys = ON;
