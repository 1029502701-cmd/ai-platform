-- Task-Platform-016.5: DevOps, CI/CD & Platform Engineering

-- Feature flags table for runtime toggles
CREATE TABLE IF NOT EXISTS feature_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    enabled INTEGER DEFAULT 1,
    target_tenant_id INTEGER,
    target_user_id INTEGER,
    rollout_percentage INTEGER DEFAULT 100 CHECK(rollout_percentage >= 0 AND rollout_percentage <= 100),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ff_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_ff_status ON feature_flags(status);
CREATE INDEX IF NOT EXISTS idx_ff_tenant ON feature_flags(target_tenant_id);