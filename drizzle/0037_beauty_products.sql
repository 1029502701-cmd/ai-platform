-- Migration 0037: Beauty monetization - products and bloggers libraries

CREATE TABLE IF NOT EXISTS beauty_products (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  affiliate_url TEXT,
  price_range TEXT,
  skin_tags TEXT,
  face_tags TEXT,
  style_tags TEXT,
  commission_rate REAL DEFAULT 0.05,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bp_status ON beauty_products(status);
CREATE INDEX IF NOT EXISTS idx_bp_category ON beauty_products(category);
CREATE INDEX IF NOT EXISTS idx_bp_face_tags ON beauty_products(face_tags);

CREATE TABLE IF NOT EXISTS beauty_bloggers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  profile_url TEXT,
  followers REAL DEFAULT 0,
  style_tags TEXT,
  face_tags TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bb_platform ON beauty_bloggers(platform);
CREATE INDEX IF NOT EXISTS idx_bb_status ON beauty_bloggers(status);
