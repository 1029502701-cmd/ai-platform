-- Create beauty_profiles table
CREATE TABLE IF NOT EXISTS beauty_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  current_face_shape TEXT,
  current_eye_shape TEXT,
  skin_info TEXT,
  preferred_style TEXT,
  favorite_colors TEXT,
  analysis_count INTEGER NOT NULL DEFAULT 0,
  last_analysis_id TEXT REFERENCES beauty_reports(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
