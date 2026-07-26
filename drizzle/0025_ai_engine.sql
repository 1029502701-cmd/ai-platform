
-- ai_scenarios: registry of AI use cases
CREATE TABLE IF NOT EXISTS ai_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    description TEXT,
    default_model_id TEXT,
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    supported_models TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_scenarios_status ON ai_scenarios(status);

-- Seed scenario data
INSERT OR IGNORE INTO ai_scenarios (key, name, description, default_model_id, temperature, max_tokens) VALUES
    ('beauty', 'AI Beauty Analysis', 'Analyze and generate beauty reports', 'openai-gpt-4o-mini', 0.3, 512),
    ('chat', 'AI Chat Assistant', 'General purpose conversation', 'deepseek-chat', 0.7, 2048),
    ('translate', 'AI Translation', 'Multilingual translation service', 'gemini-pro', 0.2, 4096),
    ('image', 'AI Image Generation', 'Generate images from text prompts', 'dalle-3', 0.8, 100),
    ('summary', 'AI Summary', 'Summarize articles and documents', 'gpt-4o-mini', 0.5, 1024),
    ('code', 'AI Code Assistant', 'Programming assistance', 'claude-opus', 0.3, 4096);

-- ai_prompt_templates: versioned prompt management
CREATE TABLE IF NOT EXISTS ai_prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    scenario TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 0,
    variables TEXT DEFAULT '[]',
    metadata TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_scenario ON ai_prompt_templates(scenario);
CREATE INDEX IF NOT EXISTS idx_prompt_name_active ON ai_prompt_templates(name, is_active);

-- ai_tools: tool calling registry
CREATE TABLE IF NOT EXISTS ai_tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    parameters_schema TEXT,
    handler_url TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_tools_enabled ON ai_tools(enabled);

-- AI metrics tracking table (for billing analytics)
CREATE TABLE IF NOT EXISTS ai_call_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL DEFAULT '',
    user_id TEXT,
    scenario TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'success',
    retry_count INTEGER DEFAULT 0,
    fallback_used INTEGER DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_request ON ai_call_metrics(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_user ON ai_call_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_scenario ON ai_call_metrics(scenario);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_provider ON ai_call_metrics(provider);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_created ON ai_call_metrics(created_at);
