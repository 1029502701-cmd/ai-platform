-- Migration 0036: Beauty integration — R2 key column + AI tracking fields

-- Add image_key to beauty_reports (reference to R2 key, not full URL)
ALTER TABLE beauty_reports ADD COLUMN image_key TEXT;

-- Index on image_key for faster lookup by uploaded file
CREATE INDEX IF NOT EXISTS idx_beauty_reports_image_key ON beauty_reports(image_key);

-- Add tracking fields to analysis_history (optional, for audit)
ALTER TABLE beauty_analysis_history ADD COLUMN prompt_key TEXT;
ALTER TABLE beauty_analysis_history ADD COLUMN model_used TEXT;

-- Update ai_scenarios with defaults for beauty-analysis
UPDATE ai_scenarios SET default_model_id = 'gpt-4o', default_prompt_key = 'beauty_analysis'
WHERE scenario_key = 'beauty-analysis';

-- Verify scenarios
SELECT scenario_key, display_name, default_model_id, default_prompt_key FROM ai_scenarios WHERE scenario_key LIKE 'beauty%';
