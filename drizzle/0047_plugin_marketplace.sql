/** ================================================================
Task-Platform-014: Plugin Marketplace Foundation
Adds plugin_catalog, plugin_publish_requests, and plugin_categories tables
=============================================================== **/

-- 1. plugin_catalog - Stores published plugin metadata available in the marketplace
CREATE TABLE IF NOT EXISTS plugin_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    icon_url TEXT,
    author TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('draft','submitted','reviewing','approved','rejected','published','disabled')),
    visibility TEXT NOT NULL CHECK(visibility IN ('public','private')),
    featured INTEGER DEFAULT 0,
    version TEXT NOT NULL,
    install_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_catalog_plugin_id ON plugin_catalog(plugin_id);
CREATE INDEX IF NOT EXISTS idx_catalog_category ON plugin_catalog(category);
CREATE INDEX IF NOT EXISTS idx_catalog_status ON plugin_catalog(status);
CREATE INDEX IF NOT EXISTS idx_catalog_visibility ON plugin_catalog(visibility);
CREATE INDEX IF NOT EXISTS idx_catalog_featured_featured ON plugin_catalog(featured, status);

-- 2. plugin_publish_requests - Stores submission requests for new plugin versions
CREATE TABLE IF NOT EXISTS plugin_publish_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,
    version TEXT NOT NULL,
    submitter_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('draft','submitted','reviewing','approved','rejected')),
    review_note TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_requests_plugin_id ON plugin_publish_requests(plugin_id);
CREATE INDEX IF NOT EXISTS idx_requests_submitter_id ON plugin_publish_requests(submitter_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON plugin_publish_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_unique_version ON plugin_publish_requests(plugin_id,version);

-- 3. plugin_categories - Stores predefined plugin categories
CREATE TABLE IF NOT EXISTS plugin_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON plugin_categories(name);

-- Insert default categories if they don't exist
INSERT INTO plugin_categories (name, description) VALUES
('tool','Tools for various tasks and utilities'),
('writing','Writing assistance tools'),
('image','Image processing and manipulation'),
('beauty','Beauty and image analysis'),
('communication','Communication and collaboration'),
('education','Education and learning tools'),
('business','Business productivity tools') ON CONFLICT(name) DO NOTHING;