-- Task-Platform-008: Notification Center Foundation
-- Migration for notification center tables

-- ============================================
-- 1. notification_templates
-- ============================================

CREATE TABLE IF NOT EXISTS notification_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    channel TEXT NOT NULL CHECK(channel IN ('system', 'email', 'wechat', 'sms', 'webhook', 'push')),
    template_type TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    subject TEXT,
    content TEXT NOT NULL,
    variables TEXT DEFAULT '[]',
    metadata TEXT DEFAULT '{}' ,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'draft', 'deleted')),
    created_by INTEGER,
    updated_by INTEGER,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nt_tenant ON notification_templates(tenant_id);
CREATE INDEX IF NOT EXISTS nt_channel ON notification_templates(channel);
CREATE INDEX IF NOT EXISTS nt_status ON notification_templates(status);
CREATE UNIQUE INDEX IF NOT EXISTS nt_unique_name_channel_version ON notification_templates(tenant_id, name, channel, version);

-- ============================================
-- 2. notifications
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    template_id INTEGER,
    trigger_id TEXT,
    notification_type TEXT,
    channel TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'retrying', 'cancelled')),
    priority INTEGER DEFAULT 1,
    delivery_count INTEGER DEFAULT 0,
    next_send_at DATETIME,
    scheduled_by INTEGER,
    sent_at DATETIME,
    failed_at DATETIME,
    error_message TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS n_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS n_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS n_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS n_status ON notifications(status);
CREATE INDEX IF NOT EXISTS n_next_send ON notifications(next_send_at);

-- ============================================
-- 3. notification_logs
-- ============================================

CREATE TABLE IF NOT EXISTS notification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL,
    channel TEXT NOT NULL,
    attempt_number INTEGER DEFAULT 1,
    status TEXT NOT NULL CHECK(status IN ('attempted', 'success', 'failed', 'queued')),
    payload_sent TEXT,
    response_received TEXT,
    error_details TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS nl_notification ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS nl_tenant ON notification_logs(tenant_id);
CREATE INDEX IF NOT EXISTS nl_status ON notification_logs(status);

-- ============================================
-- 4. notification_preferences
-- ============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    channel TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    sound_enabled INTEGER DEFAULT 1,
    notification_type TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS np_unique_user_channel ON notification_preferences(tenant_id, user_id, channel, notification_type);
CREATE INDEX IF NOT EXISTS np_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS np_channel ON notification_preferences(channel);

-- ============================================
-- 5. notification_channels
-- ============================================

CREATE TABLE IF NOT EXISTS notification_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    icon TEXT,
    config TEXT DEFAULT '{}' ,
    is_enabled DEFAULT 1,
    weight INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO notification_channels (channel_name, display_name, icon, is_enabled, weight) VALUES
    ('system', '系统通知', '🔔', 1, 1),
    ('email', '电子邮件', '📧', 1, 2),
    ('wechat', '微信通知', '🤖', 1, 3),
    ('sms', '短信通知', '📱', 1, 4),
    ('webhook', 'Webhook', '🌐', 1, 5),
    ('push', '推送通知', '📲', 1, 6);

CREATE INDEX IF NOT EXISTS nc_channel ON notification_channels(channel_name);

-- Additional Indexes FOR performance
CREATE INDEX IF NOT EXISTS n_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS nt_created_at ON notification_templates(created_at);
CREATE INDEX IF NOT EXISTS np_created_at ON notification_preferences(created_at);
CREATE INDEX IF NOT EXISTS nl_created_at ON notification_logs(created_at);
