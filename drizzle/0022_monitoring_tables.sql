-- Monitor table: system_logs for all request/task logging
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL DEFAULT '',
    level TEXT NOT NULL DEFAULT 'info',
    module TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    metadata TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_system_logs_request_id ON system_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_module ON system_logs(module);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_module_created ON system_logs(module, created_at);

-- AI call usage logs (for billing and monitoring)
CREATE TABLE IF NOT EXISTS ai_call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL DEFAULT '',
    user_id TEXT,
    task_id TEXT,
    provider TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    scenario TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Indexes for AI call logs
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_request_id ON ai_call_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_user_id ON ai_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_provider ON ai_call_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_status ON ai_call_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_created_at ON ai_call_logs(created_at);
