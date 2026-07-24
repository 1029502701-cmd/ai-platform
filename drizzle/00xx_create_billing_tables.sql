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
