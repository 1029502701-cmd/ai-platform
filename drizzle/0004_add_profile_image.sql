PRAGMA foreign_keys = ON;

-- Add image_url to profiles if not present
ALTER TABLE profiles ADD COLUMN image_url TEXT;