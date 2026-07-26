-- Migration: Queue Performance Indexes (Task-Platform-006-Step5)
-- Purpose: Add missing indexes for production queue monitoring and admin dashboard performance

-- 1. ai_tasks indexes (ensure coverage for admin queries)
CREATE INDEX IF NOT EXISTS idx_ai_tasks_user_id ON ai_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_created_at ON ai_tasks(created_at);

-- 2. billing_reservations indexes already covered by 0019:
--    idx_billing_res_user_status (user_id, status)
--    idx_billing_res_task (task_id)
--    idx_billing_res_expires (expires_at WHERE status='pending')

-- 3. wallets table frozen_credits column added by 0019

