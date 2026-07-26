-- Task-Platform-017: Open Platform, API Gateway & Developer Ecosystem

-- Developers table
CREATE TABLE IF NOT EXISTS developers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deleted')),
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dev_tenant ON developers(tenant_id);

-- API Keys (stores hash of the actual key, never raw keys long-term)
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    developer_id INTEGER NOT NULL REFERENCES developers(id),
    key_hash TEXT NOT NULL UNIQUE,     -- SHA-256 hash of the actual API key
    name TEXT NOT NULL,
    permissions TEXT DEFAULT '[]',      -- JSON array of permission strings
    daily_quota INTEGER DEFAULT 0,      // 0 = unlimited
    monthly_quota INTEGER DEFAULT 0,    // 0 = unlimited
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'revoked', 'disabled')),
    expires_at DATETIME,
    ip_whitelist TEXT DEFAULT '[]',     -- JSON array of IP addresses
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ak_developer ON api_keys(developer_id);
CREATE INDEX IF NOT EXISTS idx_ak_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_ak_hash ON api_keys(key_hash);

-- API Usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    developer_id INTEGER NOT NULL,
    api_key_id INTEGER NOT NULL REFERENCES api_keys(id),
    resource_type TEXT DEFAULT 'chat' CHECK(resource_type IN ('chat', 'image', 'agent', 'workflow', 'knowledge', 'custom')),
    endpoint TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    status_code INTEGER DEFAULT 200,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_au_developer ON api_usage(developer_id);
CREATE INDEX IF NOT EXISTS idx_au_key ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_au_created ON api_usage(created_at);

-- Webhooks (outbound events)
CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    developer_id INTEGER NOT NULL REFERENCES developers(id),
    url TEXT NOT NULL,
    events TEXT DEFAULT '[]',           -- JSON array of event types
    secret TEXT,                         -- HMAC signature key
    status TEXT DEFAULT 'active' CHECK(status IN ('pending', 'delivered', 'failed')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wh_developer ON webhooks(developer_id);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_id INTEGER NOT NULL REFERENCES webhooks(id),
    event_type TEXT NOT NULL,           // agent.completed, payment.success, etc.
    payload TEXT NOT NULL,              // JSON payload
    delivered_at DATETIME,
    response_code INTEGER,
    retries INTEGER DEFAULT 0,
    last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_wl_webhook ON webhook_logs(webhook_id);