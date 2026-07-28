-- Beauty Events Table Migration
-- Tracks user actions in the beauty analysis workflow for beta testing analytics
-- Can be used for funnel analysis, success rate tracking, and user behavior understanding

CREATE TABLE IF NOT EXISTS beauty_events (
    id TEXT PRIMARY KEY DEFAULT uuidv(),          -- Unique event ID
    user_id TEXT,                                 -- NULL for guest users
    event_type TEXT NOT NULL,                     -- upload_start, upload_success, analysis_start, etc.
    report_id TEXT,                               -- Optional reference to a beauty report
    metadata_json TEXT,                           -- Additional event metadata (JSON)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- Auto-timestamp
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_beauty_events_user ON beauty_events(user_id);
CREATE INDEX IF NOT EXISTS idx_beauty_events_type ON beauty_events(event_type);
CREATE INDEX IF NOT EXISTS idx_beauty_events_created ON beauty_events(created_at);
CREATE INDEX IF NOT EXISTS idx_beauty_events_report ON beauty_events(report_id);

-- Note: uuidv() function is provided by Cloudflare D1 or should be implemented 
-- as a scalar function in your environment. Alternative: use hex(random()) || '_' || strftime('%f', 'now') for unique IDs.

