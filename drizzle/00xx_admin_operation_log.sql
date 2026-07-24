-- Migration: admin_operation_log
CREATE TABLE IF NOT EXISTS admin_operation_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);
