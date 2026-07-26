-- Create beauty_reports table (was missing from migrations, only existed in schema.ts)
CREATE TABLE IF NOT EXISTS beauty_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  report_json TEXT,
  share_image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_beauty_reports_user_id ON beauty_reports(user_id);
