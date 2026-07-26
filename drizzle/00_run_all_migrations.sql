-- ============================================================
-- Combined production migration script for ai-platform D1
-- Generated: 2026-07-25
-- Run: wrangler d1 execute <DB_NAME> --file=drizzle/00_run_all_migrations.sql
-- ============================================================

PRAGMA foreign_keys = ON;

--- Migration: 0001_initial.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'super_admin')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  conversation_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  provider TEXT,
  input_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(input_json)),
  result_json TEXT
    CHECK (result_json IS NULL OR json_valid(result_json)),
  error_code TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_locale ON profiles(locale);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_created
  ON ai_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_created
  ON ai_jobs(status, created_at ASC);


--- Migration: 0002_auth_sessions.sql
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  session_version INTEGER NOT NULL DEFAULT 1 CHECK (session_version > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_seen_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
  ON auth_sessions(user_id, revoked_at, expires_at);


--- Migration: 0003_roles_permissions.sql
-- drizzle migration: 0003_roles_permissions.sql
-- Adds roles, permissions, role_permissions, user_roles, and audit_logs

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  meta TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed some minimal permissions and roles if not exists
INSERT OR IGNORE INTO permissions (id, name, description, created_at) VALUES
  ('user.profile.read','user.profile.read','Read own profile', datetime('now')),
  ('user.profile.update','user.profile.update','Update own profile', datetime('now')),
  ('admin.roles.manage','admin.roles.manage','Manage roles and permissions', datetime('now')),
  ('admin.users.manage','admin.users.manage','Manage user roles', datetime('now'));

INSERT OR IGNORE INTO roles (id, name, description, created_at) VALUES
  ('role_user','User','Default platform user', datetime('now')),
  ('role_admin','Admin','Platform administrator', datetime('now')),
  ('role_super_admin','SuperAdmin','Super administrator with all permissions', datetime('now'));

-- Map some permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role_user','user.profile.read'),
  ('role_user','user.profile.update'),
  ('role_admin','admin.roles.manage'),
  ('role_admin','admin.users.manage'),
  ('role_super_admin','admin.roles.manage'),
  ('role_super_admin','admin.users.manage');

-- NOTE: Assigning a super admin user should be done by ops after deployment (seed binds a user id if desired)


--- Migration: 0004_add_profile_image.sql
PRAGMA foreign_keys = ON;

-- Add image_url to profiles if not present
ALTER TABLE profiles ADD COLUMN image_url TEXT;

--- Migration: 0004_user_settings.sql
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


--- Migration: 0005_ai_providers_models.sql
-- Migration 0005: ai_providers and ai_models

CREATE TABLE IF NOT EXISTS ai_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  provider_model_name TEXT NOT NULL,
  default_params TEXT,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_ai_models_status ON ai_models(status);


--- Migration: 0006_ai_model_limits.sql
-- Migration 0006: ai_model_limits for Task-302

CREATE TABLE IF NOT EXISTS ai_model_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  limit_type TEXT NOT NULL, -- e.g., 'per_user', 'per_org', 'global'
  limit_value INTEGER NOT NULL,
  window_seconds INTEGER DEFAULT 3600,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_model_limits_model_id ON ai_model_limits(model_id);


--- Migration: 0007_prompts.sql
-- Migration 0007: prompts and prompt_versions for Prompt Engine (Task-303)

CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT,
  category TEXT,
  current_version_id INTEGER,
  status TEXT DEFAULT 'draft', -- draft | published | archived
  variables_schema TEXT, -- JSON schema or simple definition
  allow_user_override BOOLEAN DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prompt_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  variables TEXT,
  meta TEXT,
  status TEXT DEFAULT 'draft', -- draft | published | archived
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_status ON prompt_versions(status);


--- Migration: 0008_knowledge.sql
-- Migration 0008: knowledge engine tables (knowledge_bases, knowledge_documents, knowledge_chunks)

CREATE TABLE IF NOT EXISTS knowledge_bases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  status TEXT DEFAULT 'active',
  owner_id TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_base_id INTEGER NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  doc_key TEXT,
  title TEXT,
  summary TEXT,
  content_location TEXT,
  content TEXT,
  metadata TEXT,
  status TEXT DEFAULT 'published',
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_key ON knowledge_bases(key);
CREATE INDEX IF NOT EXISTS idx_docs_base ON knowledge_documents(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON knowledge_chunks(document_id);


--- Migration: 0009_ai_scenarios.sql
-- Migration 0009: ai_scenarios mapping for AI Core

CREATE TABLE IF NOT EXISTS ai_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_key TEXT NOT NULL UNIQUE,
  display_name TEXT,
  default_model_id TEXT,
  default_prompt_key TEXT,
  default_kb_key TEXT,
  tenant_id TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_scenarios_scenario_key ON ai_scenarios(scenario_key);


--- Migration: 0010_ai_tasks.sql
-- Migration 0010: ai_tasks table for AI Queue (Task-401)

CREATE TABLE IF NOT EXISTS ai_tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  payload TEXT,
  result TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retry INTEGER DEFAULT 3,
  next_run_at TIMESTAMP NULL,
  locked_by TEXT NULL,
  locked_at TIMESTAMP NULL,
  created_by TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  last_error TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_tasks_status_priority_next_run ON ai_tasks(status, priority, next_run_at);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_locked_by ON ai_tasks(locked_by);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_created_by ON ai_tasks(created_by);


--- Migration: 0011_ai_tasks_retry.sql
-- Migration 0011: add retry fields to ai_tasks for Task-403

ALTER TABLE ai_tasks ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE ai_tasks ADD COLUMN max_retry INTEGER DEFAULT 3;
ALTER TABLE ai_tasks ADD COLUMN next_retry_at TIMESTAMP NULL;

-- Note: If columns already exist, these ALTERs may fail on some SQLite versions. Review before applying in production.

--- Migration: 0012_add_profile_last_analysis_image.sql
PRAGMA foreign_keys = ON;

-- Add last_analysis_image to profiles
ALTER TABLE profiles ADD COLUMN last_analysis_image TEXT;


--- Migration: 0014_add_beauty_profile_fields.sql
-- Create beauty_profiles table
CREATE TABLE IF NOT EXISTS beauty_profiles (
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


--- Migration: 0015_create_beauty_analysis_history.sql
-- Create beauty_analysis_history table
CREATE TABLE IF NOT EXISTS beauty_analysis_history (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  report_id TEXT REFERENCES beauty_reports(id) ON DELETE SET NULL,
  image_url TEXT,
  face_analysis_json TEXT,
  style_result TEXT,
  created_at TEXT NOT NULL
);


--- Migration: 0016_modify_users_add_auth_fields.sql
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


--- Migration: 0017_create_user_sessions.sql
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


--- Migration: 0018_create_user_usage_limits.sql
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


--- Migration: 00xx_admin_operation_log.sql
-- Migration: admin_operation_log
CREATE TABLE IF NOT EXISTS admin_operation_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);


--- Migration: 00xx_create_billing_tables.sql
-- Migration: create_billing_tables

CREATE TABLE IF NOT EXISTS wallet (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  credits INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  service TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL,
  transaction_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS ai_pricing (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  model TEXT NOT NULL,
  credits INTEGER DEFAULT 1,
  cost_usd REAL NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  credits INTEGER DEFAULT 0,
  duration_days INTEGER DEFAULT 30,
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  expire_time TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL
);


--- Migration: 00xx_plan_features_and_seed.sql
-- Migration: add plan_features and seed plans

CREATE TABLE IF NOT EXISTS plan_features (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  feature_value TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Seed plans if not exist
INSERT INTO plans (id, name, price, credits, duration_days, enabled, created_at)
SELECT 'plan_free', 'Free', 0, 100, 30, 1, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE id = 'plan_free');

INSERT INTO plans (id, name, price, credits, duration_days, enabled, created_at)
SELECT 'plan_pro', 'Pro', 2900, 10000, 30, 1, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE id = 'plan_pro');

INSERT INTO plans (id, name, price, credits, duration_days, enabled, created_at)
SELECT 'plan_vip', 'VIP', 9900, 50000, 30, 1, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE id = 'plan_vip');

-- Seed plan_features
INSERT INTO plan_features (id, plan_id, feature_key, feature_value, created_at)
SELECT 'pf_free_chat_limit', 'plan_free', 'AI_CHAT_LIMIT', '100', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plan_features WHERE id = 'pf_free_chat_limit');

INSERT INTO plan_features (id, plan_id, feature_key, feature_value, created_at)
SELECT 'pf_pro_chat_limit', 'plan_pro', 'AI_CHAT_LIMIT', '5000', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plan_features WHERE id = 'pf_pro_chat_limit');

INSERT INTO plan_features (id, plan_id, feature_key, feature_value, created_at)
SELECT 'pf_vip_video', 'plan_vip', 'VIDEO_GENERATION', 'true', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plan_features WHERE id = 'pf_vip_video');


--- Patch: Create beauty_reports table (was only in Drizzle schema, never in SQL migrations)
CREATE TABLE IF NOT EXISTS beauty_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  report_json TEXT,
  share_image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_beauty_reports_user_id ON beauty_reports(user_id);

