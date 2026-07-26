-- user_quotas: per-user quota tracking (extension of existing user_usage_limits)
CREATE TABLE IF NOT EXISTS user_quotas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE DEFAULT '',
    quota_type TEXT NOT NULL DEFAULT '',
    total_limit INTEGER NOT NULL DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    reset_interval TEXT NOT NULL DEFAULT 'daily',
    next_reset DATETIME DEFAULT (datetime('now','+1 day')),
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, quota_type)
);

CREATE INDEX IF NOT EXISTS idx_user_quotas_user ON user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_type ON user_quotas(quota_type);

-- user_usage: detailed action log
CREATE TABLE IF NOT EXISTS user_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL DEFAULT '',
    model TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cost_cents REAL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,
    duration_ms INTEGER,
    metadata TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_usage_user ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_action ON user_usage(action);
CREATE INDEX IF NOT EXISTS idx_user_usage_created_at ON user_usage(created_at);

-- user_plans: plan tiers
CREATE TABLE IF NOT EXISTS user_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    description TEXT,
    monthly_request_limit INTEGER NOT NULL DEFAULT -1,
    daily_ai_call_limit INTEGER NOT NULL DEFAULT 10,
    image_generate_limit INTEGER NOT NULL DEFAULT 0,
    max_file_size_mb INTEGER NOT NULL DEFAULT 5,
    priority_level INTEGER NOT NULL DEFAULT 0,
    features TEXT DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO user_plans (name, display_name, description, monthly_request_limit, daily_ai_call_limit, image_generate_limit, max_file_size_mb, priority_level, features) VALUES
    ('free', 'Free', 'Basic access for all users', -1, 50, 0, 5, 0, '"basic_access"'),
    ('pro', 'Pro', 'Enhanced limits and features', 10000, 500, 100, 20, 50, '"priority_queue,basic_access,analytics"'),
    ('enterprise', 'Enterprise', 'Unlimited + dedicated support', -1, -1, -1, 100, 100, '"unlimited,priority_support,dedicated_model,analytics"');

-- user_plan_assignments
CREATE TABLE IF NOT EXISTS user_plan_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE DEFAULT '',
    plan_name TEXT NOT NULL DEFAULT 'free',
    assigned_at DATETIME DEFAULT (datetime('now')),
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_name) REFERENCES user_plans(name)
);

CREATE INDEX IF NOT EXISTS idx_user_plan_assignments_user ON user_plan_assignments(user_id);
