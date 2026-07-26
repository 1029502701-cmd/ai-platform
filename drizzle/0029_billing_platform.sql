-- Task-Platform-015: Billing, Membership & Commercialization Platform

-- Products catalog
CREATE TABLE IF NOT EXISTS billing_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    product_type TEXT NOT NULL DEFAULT 'plan',
    price_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'CNY',
    credits_amount INTEGER DEFAULT 0,
    features TEXT,
    status TEXT DEFAULT 'active',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_code ON billing_products(code);
CREATE INDEX IF NOT EXISTS idx_product_status ON billing_products(status);

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL REFERENCES billing_products(id),
    plan_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    start_at DATETIME DEFAULT (datetime('now')),
    expire_at DATETIME,
    auto_renew INTEGER DEFAULT 0,
    payment_provider TEXT,
    payment_ref TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sub_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON user_subscriptions(status);

-- Orders
CREATE TABLE IF NOT EXISTS billing_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    product_id INTEGER REFERENCES billing_products(id),
    amount_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'CNY',
    status TEXT DEFAULT 'pending',
    payment_provider TEXT,
    payment_ref TEXT,
    paid_at DATETIME,
    cancelled_at DATETIME,
    refunded_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_user ON billing_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON billing_orders(status);
CREATE INDEX IF NOT EXISTS idx_order_no ON billing_orders(order_no);

-- Billing transactions (audit trail for every credit change)
CREATE TABLE IF NOT EXISTS billing_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_id INTEGER REFERENCES billing_orders(id),
    subscription_id INTEGER REFERENCES user_subscriptions(id),
    tx_type TEXT NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    balance_before INTEGER DEFAULT 0,
    balance_after INTEGER DEFAULT 0,
    reason TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_user ON billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_order ON billing_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_tx_type ON billing_transactions(tx_type);

-- Billing rules (model pricing, quota limits)
CREATE TABLE IF NOT EXISTS billing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_key TEXT NOT NULL UNIQUE,
    service_type TEXT NOT NULL DEFAULT 'ai',
    target TEXT,
    cost_per_1m_input INTEGER DEFAULT 0,
    cost_per_1m_output INTEGER DEFAULT 0,
    credits_per_1m_input INTEGER DEFAULT 0,
    credits_per_1m_output INTEGER DEFAULT 0,
    image_cost_cents INTEGER DEFAULT 0,
    agent_cost_cents INTEGER DEFAULT 0,
    knowledge_cost_cents INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rule_key ON billing_rules(rule_key);

-- Default billing rules
INSERT OR IGNORE INTO billing_rules (rule_key, service_type, target, cost_per_1m_input, cost_per_1m_output, credits_per_1m_input, credits_per_1m_output) VALUES
('gpt4omini', 'ai', 'openai-gpt-4o-mini', 150, 600, 150, 600),
('gpt4o', 'ai', 'openai-gpt-4o', 2500, 10000, 2500, 10000),
('gemini', 'ai', 'gemini-pro', 350, 1050, 350, 1050),
('claudeopus', 'ai', 'claude-opus', 15000, 75000, 15000, 75000),
('deepseek', 'ai', 'deepseek-chat', 140, 280, 140, 280),
('image_gen', 'ai', 'all', 0, 0, 0, 0, 1500),
('agent_exec', 'ai', 'all', 0, 0, 0, 0, 0, 500);