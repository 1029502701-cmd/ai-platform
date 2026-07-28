-- ============================================================================
-- Migration: 0043_monitoring_center.sql
-- Description: Monitoring Center Foundation - Core Tables
-- ============================================================================

-- Table: system_metrics - Central metrics storage for all platform components
CREATE TABLE IF NOT EXISTS system_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT DEFAULT ''',
    level TEXT NOT NULL DEFAULT 'info',
    module TEXT NOT NULL,
    request_id TEXT,
    user_id TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_name ON system_metrics(metric_name);
CREATE_INDEX IF NOT EXISTS idx_system_metrics_module ON system_metrics(module);
CREATE_INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at);
CREATE_INDEX IF NOT EXISTS idx_system_metrics_level ON system_metrics(level);
CREATE_INDEX IF NOT EXISTS idx_system_metrics_request_id ON system_metrics(request_id)

echo DONE
