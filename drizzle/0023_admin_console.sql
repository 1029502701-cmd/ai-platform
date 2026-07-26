-- System settings table (database-driven configuration)
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE DEFAULT '',
    value TEXT NOT NULL DEFAULT '',
    description TEXT,
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Seed default settings
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES
    ('ai_default_provider', 'openai', 'Default AI provider for new users'),
    ('ai_model_priority', 'gpt-4,deepseek-v3,gemini-pro', 'Ordered list of models by priority'),
    ('request_rate_limit', '100', 'Max requests per user per hour'),
    ('log_level', 'info', 'Minimum log level: debug|info|warn|error'),
    ('user_default_daily_quota', '50', 'Default daily AI call quota for new users'),
    ('max_retries', '3', 'Maximum retry attempts for failed tasks'),
    ('task_timeout_seconds', '300', 'Task execution timeout in seconds'),
    ('registration_enabled', 'true', 'Enable/disable new user registration');

-- Prompts table (versioned prompt management)
CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    scenario TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    UNIQUE(name, version)
);

CREATE INDEX IF NOT EXISTS idx_prompts_scenario ON prompts(scenario);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts(status);
CREATE INDEX IF NOT EXISTS idx_prompts_name_status ON prompts(name, status);

-- Prompt versions (read-only snapshot per version)
CREATE TABLE IF NOT EXISTS prompt_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL DEFAULT '',
    diff_summary TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (prompt_id) REFERENCES prompts(id),
    UNIQUE(prompt_id, version)
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON prompt_versions(prompt_id);

-- RBAC: admin_roles extended (upgrade existing roles table)
-- Add super_admin role if not exists
-- (roles/permissions already exist from migration 0003)

-- New admin-specific permission tables
CREATE TABLE IF NOT EXISTS admin_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    description TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Seed admin roles
INSERT OR IGNORE INTO admin_roles (name, display_name, description) VALUES
    ('super_admin', '超级管理员', 'Full access to all features including system config'),
    ('admin', '管理员', 'Access to users, AI, tasks, billing, and system settings'),
    ('operator', '运营人员', 'Read access to all data plus task management and prompt editing'),
    ('viewer', '观察员', 'Read-only access to dashboard and logs');

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL DEFAULT '',
    description TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- Seed permissions
INSERT OR IGNORE INTO permissions (resource, action, description) VALUES
    ('dashboard', 'view', 'View admin dashboard'),
    ('users', 'view', 'View user list'),
    ('users', 'edit', 'Modify user info or status'),
    ('users', 'delete', 'Delete user accounts'),
    ('models', 'view', 'View AI models configuration'),
    ('models', 'edit', 'Modify model settings'),
    ('models', 'create', 'Add new models'),
    ('models', 'delete', 'Remove models'),
    ('tasks', 'view', 'View task queue'),
    ('tasks', 'retry', 'Retry failed tasks manually'),
    ('tasks', 'cancel', 'Cancel running/pending tasks'),
    ('prompts', 'view', 'View prompt library'),
    ('prompts', 'edit', 'Edit prompts'),
    ('prompts', 'publish', 'Publish prompts to active'),
    ('logs', 'view', 'View system logs'),
    ('queue', 'view', 'View queue status'),
    ('queue', 'manage', 'Manage queue operations'),
    ('settings', 'view', 'View system settings'),
    ('settings', 'edit', 'Modify system settings'),
    ('billing', 'view', 'View billing data');

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    FOREIGN KEY (role_id) REFERENCES admin_roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id),
    UNIQUE(role_id, permission_id)
);

-- Map permissions to each admin role
-- Super admin gets everything
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT ar.id, p.id FROM admin_roles ar CROSS JOIN permissions p WHERE ar.name = 'super_admin';

-- Admin gets most except delete user
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT ar.id, p.id FROM admin_roles ar JOIN permissions p ON ar.name = 'admin'
WHERE NOT (p.resource = 'users' AND p.action = 'delete');

-- Operator gets view + limited edit
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT ar.id, p.id FROM admin_roles ar JOIN permissions p ON ar.name = 'operator'
WHERE p.resource IN ('dashboard','users','tasks','prompts','logs','queue','settings')
AND p.action IN ('view','edit')
OR (p.resource = 'prompts' AND p.action = 'publish');

-- Viewer gets read-only
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT ar.id, p.id FROM admin_roles ar JOIN permissions p ON ar.name = 'viewer'
WHERE p.action = 'view';
