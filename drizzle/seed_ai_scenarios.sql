-- Seed default AI scenarios after migrations are applied
-- Run: wrangler d1 execute <DB_NAME> --file=drizzle/seed_ai_scenarios.sql

INSERT OR IGNORE INTO ai_scenarios (scenario_key, display_name, default_prompt_key, created_at, updated_at) VALUES
  ('beauty-analysis', '美妆分析', NULL, datetime('now'), datetime('now')),
  ('beauty-report', '美妆报告', NULL, datetime('now'), datetime('now')),
  ('chat-basic', '基础对话', NULL, datetime('now'), datetime('now')),
  ('image-analysis', '图片分析', NULL, datetime('now'), datetime('now'));

-- Verify
SELECT scenario_key, display_name FROM ai_scenarios ORDER BY id;
