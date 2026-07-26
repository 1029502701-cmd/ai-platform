-- Migration: billing_reservations (Queue integration)
-- Part of Task-Platform-006-Step-4: Reserve/Commit/Refund billing flow

-- 1. Add frozen_credits column to wallets table
ALTER TABLE wallets ADD COLUMN frozen_credits INTEGER DEFAULT 0;

-- 2. Create billing_reservations table
CREATE TABLE IF NOT EXISTS billing_reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL UNIQUE,
  reserved_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_billing_res_user_status ON billing_reservations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_res_task ON billing_reservations(task_id);
CREATE INDEX IF NOT EXISTS idx_billing_res_expires ON billing_reservations(expires_at) WHERE status = 'pending';