-- Create plugin_pricing_plans table for storing plugin pricing strategies
CREATE TABLE IF NOT EXISTS plugin_pricing_plans (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('free', 'credit', 'subscription', 'usage')),
  price INTEGER DEFAULT 0,
  credits_cost INTEGER DEFAULT 0,
  billing_period TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(plugin_id, plan_name),
  FOREIGN KEY (plugin_id) REFERENCES plugins(plugin_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pricing_plugin_id ON plugin_pricing_plans(plugin_id);
CREATE INDEX IF NOT EXISTS idx_pricing_status ON plugin_pricing_plans(status);
CREATE INDEX IF NOT EXISTS idx_pricing_type ON plugin_pricing_plans(pricing_type);

-- Create plugin_usage_records table for tracking plugin consumption
CREATE TABLE IF NOT EXISTS plugin_usage_records (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  request_id TEXT,
  usage_type TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (plugin_id) REFERENCES plugins(plugin_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_usage_record_plugin_id ON plugin_usage_records(plugin_id);
CREATE INDEX IF NOT EXISTS idx_usage_record_user_id ON plugin_usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_record_created_at ON plugin_usage_records(created_at);

-- Create plugin_revenue_transactions table for revenue sharing
CREATE TABLE IF NOT EXISTS plugin_revenue_transactions (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  developer_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'subscription', 'withdraw')),
  gross_amount INTEGER NOT NULL DEFAULT 0,
  platform_fee INTEGER DEFAULT 0,
  developer_amount INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'CNY',
  status TEXT DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (plugin_id) REFERENCES plugins(plugin_id) ON DELETE CASCADE,
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS tx_plugin_id ON plugin_revenue_transactions(plugin_id);
CREATE INDEX IF NOT EXISTS tx_developer_id ON plugin_revenue_transactions(developer_id);
CREATE INDEX IF NOT EXISTS tx_user_id ON plugin_revenue_transactions(user_id);
CREATE INDEX IF NOT EXISTS tx_created_at ON plugin_revenue_transactions(created_at);

-- Create plugin_developer_accounts table for tracking developer balances
CREATE TABLE IF NOT EXISTS plugin_developer_accounts (
  id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL UNIQUE,
  balance INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0,
  total_withdrawn INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dev_account_id ON plugin_developer_accounts(developer_id);
CREATE INDEX IF NOT EXISTS idx_dev_status ON plugin_developer_accounts(status);
