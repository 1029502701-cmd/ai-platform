-- Migration: chat_system - Add model to conversations and tokens to messages tables

-- Add model column to conversations table if not exists
ALTER TABLE conversations ADD COLUMN model TEXT IF NOT EXISTS;

-- Add tokens column to messages table if not exists
ALTER TABLE messages ADD COLUMN tokens INTEGER IF NOT EXISTS;

-- Add index on conversations for faster user lookup
CREATE INDEX IF NOT EXISTS idx_conversations_user_model ON conversations(user_id, model);

-- Add index on messages for faster conversation lookup with tokens
CREATE INDEX IF NOT EXISTS idx_messages_conversation_tokens ON messages(conversation_id, tokens);

-- Update existing conversations with default model if missing
UPDATE conversations SET model = 'deepseek-chat' WHERE model IS NULL OR model = '';

-- Update existing messages with default token count if missing
UPDATE messages SET tokens = 0 WHERE tokens IS NULL;

-- Add check constraint for tokens (non-negative)
PRAGMA ignore_check_constraints = ON;
ALTER TABLE messages RENAME TO messages_old;
CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  model TEXT,
  tokens INTEGER CHECK (tokens >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
INSERT INTO messages (id, conversation_id, role, content, model, tokens, created_at) SELECT id, conversation_id, role, content, model, tokens, created_at FROM messages_old;
DROP TABLE messages_old;
PRAGMA ignore_check_constraints = OFF;

-- Create chat_conversations view for backward compatibility
CREATE VIEW IF NOT EXISTS chat_conversations AS SELECT * FROM conversations;

-- Create chat_messages view for backward compatibility
CREATE VIEW IF NOT EXISTS chat_messages AS SELECT * FROM messages;
