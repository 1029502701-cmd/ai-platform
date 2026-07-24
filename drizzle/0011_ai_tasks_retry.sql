-- Migration 0011: add retry fields to ai_tasks for Task-403

ALTER TABLE ai_tasks ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE ai_tasks ADD COLUMN max_retry INTEGER DEFAULT 3;
ALTER TABLE ai_tasks ADD COLUMN next_retry_at TIMESTAMP NULL;

-- Note: If columns already exist, these ALTERs may fail on some SQLite versions. Review before applying in production.