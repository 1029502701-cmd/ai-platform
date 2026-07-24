-- drizzle migration: 0003_roles_permissions.sql
-- Adds roles, permissions, role_permissions, user_roles, and audit_logs

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  meta TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed some minimal permissions and roles if not exists
INSERT OR IGNORE INTO permissions (id, name, description, created_at) VALUES
  ('user.profile.read','user.profile.read','Read own profile', datetime('now')),
  ('user.profile.update','user.profile.update','Update own profile', datetime('now')),
  ('admin.roles.manage','admin.roles.manage','Manage roles and permissions', datetime('now')),
  ('admin.users.manage','admin.users.manage','Manage user roles', datetime('now'));

INSERT OR IGNORE INTO roles (id, name, description, created_at) VALUES
  ('role_user','User','Default platform user', datetime('now')),
  ('role_admin','Admin','Platform administrator', datetime('now')),
  ('role_super_admin','SuperAdmin','Super administrator with all permissions', datetime('now'));

-- Map some permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role_user','user.profile.read'),
  ('role_user','user.profile.update'),
  ('role_admin','admin.roles.manage'),
  ('role_admin','admin.users.manage'),
  ('role_super_admin','admin.roles.manage'),
  ('role_super_admin','admin.users.manage');

-- NOTE: Assigning a super admin user should be done by ops after deployment (seed binds a user id if desired)
