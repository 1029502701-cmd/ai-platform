-- Create beauty_analysis_history table
CREATE TABLE IF NOT EXISTS beauty_analysis_history (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  report_id TEXT REFERENCES beauty_reports(id) ON DELETE SET NULL,
  image_url TEXT,
  face_analysis_json TEXT,
  style_result TEXT,
  created_at TEXT NOT NULL
);
