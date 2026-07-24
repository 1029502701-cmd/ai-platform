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
