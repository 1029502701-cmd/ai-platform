-- Beauty Database Index Optimization Migration
-- Adds indexes for beauty tables to improve query performance

-- Index on beauty_reports for user_id + created_at (pagination by user)
CREATE INDEX IF NOT EXISTS idx_beauty_reports_user_created ON beauty_reports(user_id, created_at);

-- Index on beauty_reports for created_at alone (admin listing filter by date)
CREATE INDEX IF NOT EXISTS idx_beauty_reports_created ON beauty_reports(created_at);

-- Index on beauty_profiles for user_id (profile lookups)
CREATE INDEX IF NOT EXISTS idx_beauty_profiles_user ON beauty_profiles(user_id);

-- Index on beauty_analysis_history for user_id + created_at (history queries)
CREATE INDEX IF NOT EXISTS idx_beauty_analysis_history_user_created ON beauty_analysis_history(user_id, created_at);

-- Index on beauty_analysis_history for report_id (join with reports)
CREATE INDEX IF NOT EXISTS idx_beauty_analysis_history_report ON beauty_analysis_history(report_id);

-- Note: These indexes are non-blocking on SQLite/D1. For large tables, consider
-- using online index creation techniques if supported by the database engine.

