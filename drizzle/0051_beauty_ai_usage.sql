-- Beauty AI Usage Table
-- Tracks AI model usage for beauty analysis for cost monitoring and analytics

CREATE TABLE IF NOT EXISTS beauty_ai_usage (
    id TEXT PRIMARY KEY DEFAULT uuidv(),          -- Unique ID
    user_id TEXT,                                 -- User ID (NULL for guests)
    report_id TEXT,                               -- Associated beauty report ID
    model TEXT NOT NULL,                          -- AI model used (e.g., openai-gpt-4o)
    input_tokens INTEGER DEFAULT 0,               -- Input tokens count
    output_tokens INTEGER DEFAULT 0,              -- Output tokens count
    duration_ms INTEGER DEFAULT 0,                -- Analysis duration in milliseconds
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_beauty_ai_usage_user ON beauty_ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_beauty_ai_usage_model ON beauty_ai_usage(model);
CREATE INDEX IF NOT EXISTS idx_beauty_ai_usage_created ON beauty_ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_beauty_ai_usage_report ON beauty_ai_usage(report_id);

