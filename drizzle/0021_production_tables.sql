-- Migration 0021: Production Tables
-- Adds missing tables required by packages/billing, packages/queue, and Admin Center
-- This migration is safe to run on existing DB (IF NOT EXISTS)

-- 1. wallets (plural, as used by billing package)
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  credits INTEGER DEFAULT 0,
  frozen_credits INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  total_topped_up INTEGER DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'balance',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  service TEXT NOT NULL DEFAULT 'general',
  model TEXT DEFAULT '',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  credits_per_token REAL NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  transaction_id TEXT NOT NULL UNIQUE,
  metadata TEXT,
  created_at TEXT NOT NULL
);

-- 3. ai_results
CREATE TABLE IF NOT EXISTS ai_results (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  service TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TEXT NOT NULL
);

-- 4. billing_reservations
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

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_results_task ON ai_results(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_user ON ai_results(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_res_user_status ON billing_reservations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_res_task ON billing_reservations(task_id);
CREATE INDEX IF NOT EXISTS idx_billing_res_idempotent ON billing_reservations(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_billing_res_expires ON billing_reservations(expires_at) WHERE status = 'pending';

-- 6. Fix ai_tasks: add frozen_credits support column if missing
-- (already has locked_by, locked_at, retry_count, max_retry from 0010+0011)