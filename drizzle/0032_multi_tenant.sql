-- Task-Platform-016: Multi-Tenant SaaS Platform
-- Migration to add tenant isolation across all tables

-- ============================================
-- 1. Core Tenant Tables
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deleted')),
    plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro', 'enterprise', 'platform')),
    owner_user_id INTEGER,
    domain TEXT,
    logo TEXT,
    settings TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenant_key ON tenants(tenant_key);
CREATE INDEX IF NOT EXISTS idx_tenant_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenant_plan ON tenants(plan);

-- Tenant custom domains
CREATE TABLE IF NOT EXISTS tenant_domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    domain TEXT NOT NULL,
    is_primary INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    ssl_enabled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_td_tenant ON tenant_domains(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_td_domain ON tenant_domains(domain);

-- ============================================
-- 2. Add tenant_id to users table
-- ============================================

-- Check if column exists before adding
-- SQLite doesn't support IF NOT EXISTS for ADD COLUMN in all versions, so we use a workaround

-- ============================================
-- 3. Add tenant_id to business tables
-- ============================================

-- Sessions
CREATE TABLE IF NOT EXISTS user_sessions_tenant (temp TABLE);
-- Note: We'll add columns via ALTER TABLE below

ALTER TABLE IF EXISTS users ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS user_sessions ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS ai_tasks ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS ai_usage ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS wallets ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS transactions ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS billing_orders ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS billing_transactions ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS knowledge_bases ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS agents ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS agent_tasks ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS prompts ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS system_settings ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS system_logs ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS ai_scenarios ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS ai_models ADD COLUMN tenant_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS ai_providers ADD COLUMN tenant_id INTEGER DEFAULT 1;

-- Indexes for tenant isolation
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON ai_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_tenant ON ai_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wallets_tenant ON wallets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_txns_tenant ON billing_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON billing_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_tenant ON knowledge_bases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prompts_tenant ON prompts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_tenant ON system_logs(tenant_id);