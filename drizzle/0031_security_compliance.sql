-- Task-Platform-015.5: Security, Compliance & Enterprise Hardening

-- Backup/Recovery tracking table
CREATE TABLE IF NOT EXISTS backup_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_type TEXT NOT NULL DEFAULT 'full',
    status TEXT DEFAULT 'pending',
    rows_count INTEGER,
    size_bytes INTEGER,
    s3_key TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_backup_created ON backup_records(created_at);

-- Security events table (risk engine output)
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    level TEXT DEFAULT 'info',
    actor_id TEXT,
    ip TEXT,
    user_agent TEXT,
    details TEXT,
    resolved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sec_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sec_level ON security_events(level);
CREATE INDEX IF NOT EXISTS idx_sec_actor ON security_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_sec_created ON security_events(created_at);