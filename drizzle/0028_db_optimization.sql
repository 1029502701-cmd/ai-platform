-- Performance optimization indexes for production traffic
-- Task-Platform-014.5

-- AI Usage table
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage(date(created_at));
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage(provider, date(created_at));
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, date(created_at));

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date(created_at));
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date(created_at));

-- Users
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Agent tasks
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user_date ON agent_tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status, created_at DESC);

-- System logs
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_module ON system_logs(module);