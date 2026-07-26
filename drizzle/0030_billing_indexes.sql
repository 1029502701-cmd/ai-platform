-- Task-Platform-015: Billing Platform enhancement indexes
-- Additional indexes for billing_orders and user_subscriptions performance

CREATE INDEX IF NOT EXISTS idx_order_created_at ON billing_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_paid_at ON billing_orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_sub_user_status ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tx_reason ON billing_transactions(reason);
CREATE INDEX IF NOT EXISTS idx_tx_metadata ON billing_transactions(created_at);