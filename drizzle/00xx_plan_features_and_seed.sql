-- Migration: add plan_features and seed plans

CREATE TABLE IF NOT EXISTS plan_features (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  feature_value TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Seed plans if not exist
INSERT INTO plans (id, name, price, credits, duration_days, enabled, created_at)
SELECT 'plan_free', 'Free', 0, 100, 30, 1, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE id = 'plan_free');

INSERT INTO plans (id, name, price, credits, duration_days, enabled, created_at)
SELECT 'plan_pro', 'Pro', 2900, 10000, 30, 1, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE id = 'plan_pro');

INSERT INTO plans (id, name, price, credits, duration_days, enabled, created_at)
SELECT 'plan_vip', 'VIP', 9900, 50000, 30, 1, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE id = 'plan_vip');

-- Seed plan_features
INSERT INTO plan_features (id, plan_id, feature_key, feature_value, created_at)
SELECT 'pf_free_chat_limit', 'plan_free', 'AI_CHAT_LIMIT', '100', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plan_features WHERE id = 'pf_free_chat_limit');

INSERT INTO plan_features (id, plan_id, feature_key, feature_value, created_at)
SELECT 'pf_pro_chat_limit', 'plan_pro', 'AI_CHAT_LIMIT', '5000', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plan_features WHERE id = 'pf_pro_chat_limit');

INSERT INTO plan_features (id, plan_id, feature_key, feature_value, created_at)
SELECT 'pf_vip_video', 'plan_vip', 'VIDEO_GENERATION', 'true', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM plan_features WHERE id = 'pf_vip_video');
