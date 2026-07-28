PRAGMA foreign_keys = ON;

-- Add uuid column to users table
ALTER TABLE users ADD COLUMN uuid TEXT UNIQUE DEFAULT (lower(hex(randomblob(12)))) NOT NULL;

-- Seed existing users with UUIDs
UPDATE users SET uuid = lower(hex(randomblob(12)));

-- Add device, ip_address, user_agent columns to user_sessions
ALTER TABLE user_sessions ADD COLUMN device TEXT;
ALTER TABLE user_sessions ADD COLUMN ip_address TEXT;
ALTER TABLE user_sessions ADD COLUMN user_agent TEXT;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(token);
