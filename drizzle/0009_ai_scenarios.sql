-- Migration 0009: ai_scenarios mapping for AI Core

CREATE TABLE IF NOT EXISTS ai_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_key TEXT NOT NULL UNIQUE,
  display_name TEXT,
  default_model_id TEXT,
  default_prompt_key TEXT,
  default_kb_key TEXT,
  tenant_id TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_scenarios_scenario_key ON ai_scenarios(scenario_key);
