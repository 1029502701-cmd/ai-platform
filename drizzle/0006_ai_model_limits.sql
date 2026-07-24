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
