PRAGMA foreign_keys = ON;

-- Add last_analysis_image to profiles
ALTER TABLE profiles ADD COLUMN last_analysis_image TEXT;
