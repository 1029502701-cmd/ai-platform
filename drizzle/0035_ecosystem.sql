-- ================================================================
-- Task-Platform-018: AI Ecosystem, App Marketplace & Integration Platform
-- ================================================================

-- 1. Marketplace Apps
CREATE TABLE IF NOT EXISTS marketplace_apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER DEFAULT 1,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK(category IN ('beauty','writing','office','education','marketing','coding','image','communication','business','utility')),
    icon_url TEXT,
    version TEXT NOT NULL,
    author_id INTEGER,
    developer_id INTEGER,
    rating REAL DEFAULT 0.0,
    install_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','published','rejected','removed')),
    price_cents INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ma_slug ON marketplace_apps(slug);
CREATE INDEX IF NOT EXISTS idx_ma_cat_status ON marketplace_apps(category, status);
CREATE INDEX IF NOT EXISTS idx_ma_featured ON marketplace_apps(is_featured, status);

-- 2. Marketplace App Versions
CREATE TABLE IF NOT EXISTS marketplace_app_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER REFERENCES marketplace_apps(id),
    version TEXT NOT NULL,
    changelog TEXT,
    manifest_json TEXT,
    file_size INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mav_app ON marketplace_app_versions(app_id);

-- 3. Marketplace App Installs
CREATE TABLE IF NOT EXISTS marketplace_app_installs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    app_slug TEXT NOT NULL,
    version TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','uninstalled')),
    settings_json TEXT DEFAULT '{}',
    installed_at DATETIME DEFAULT (datetime('now')),
    uninstalled_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_mai_user ON marketplace_app_installs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mai_slug ON marketplace_app_installs(app_slug);

-- 4. Plugins
CREATE TABLE IF NOT EXISTS plugins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER DEFAULT 1,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('tool','knowledge','workflow','provider','billing','connector')),
    author_id INTEGER,
    version TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','disabled','removed')),
    enabled INTEGER DEFAULT 1,
    config_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pl_tenant ON plugins(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pl_type ON plugins(type, status);

-- 5. Plugin Versions
CREATE TABLE IF NOT EXISTS plugin_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id INTEGER REFERENCES plugins(id),
    version TEXT NOT NULL,
    entry_point TEXT,
    manifest TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pver_plugin ON plugin_versions(plugin_id);

-- 6. Templates
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER DEFAULT 1,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('prompt','workflow','knowledge','agent')),
    category TEXT,
    description TEXT,
    content_json TEXT,
    version INTEGER DEFAULT 1,
    author_id INTEGER,
    is_public INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tmpl_tenant_type ON templates(tenant_id, type, is_public);
CREATE INDEX IF NOT EXISTS idx_tmpl_slug ON templates(slug);

-- 7. Workflow Marketplace
CREATE TABLE IF NOT EXISTS workflows_marketplace (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER DEFAULT 1,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    definition_json TEXT NOT NULL,
    category TEXT,
    preview_image TEXT,
    version TEXT,
    author_id INTEGER,
    developer_id INTEGER,
    rating REAL DEFAULT 0.0,
    install_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wf_slug ON workflows_marketplace(slug);
CREATE INDEX IF NOT EXISTS idx_wf_cat_status ON workflows_marketplace(category, status);

-- 8. Prompt Library
CREATE TABLE IF NOT EXISTS prompt_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER DEFAULT 1,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    scenario_key TEXT,
    version INTEGER DEFAULT 1,
    author_id INTEGER,
    tags TEXT DEFAULT '[]',
    is_public INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pl_tenant ON prompt_library(tenant_id, scenario_key, is_public);
CREATE INDEX IF NOT EXISTS idx_pl_slug ON prompt_library(slug);

-- 9. Integration Connections
CREATE TABLE IF NOT EXISTS integration_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tenant_id INTEGER DEFAULT 1,
    service TEXT NOT NULL CHECK(service IN ('wechat','wecom','feishu','dingtalk','slack','discord','telegram','email','webhook')),
    status TEXT DEFAULT 'connected' CHECK(status IN ('connected','disconnected','expired','error')),
    config_json TEXT DEFAULT '{}',
    token_data TEXT,
    connected_at DATETIME DEFAULT (datetime('now')),
    last_sync_at DATETIME,
    expires_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_ic_user ON integration_connections(user_id, service, status);

-- 10. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tenant_id INTEGER DEFAULT 1,
    type TEXT CHECK(type IN ('system','app_install','plugin_update','order','payment','notification','warning','error')),
    title TEXT NOT NULL,
    body TEXT,
    metadata_json TEXT DEFAULT '{}',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, created_at DESC);

-- 11. File Storage
CREATE TABLE IF NOT EXISTS file_storage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER DEFAULT 1,
    user_id INTEGER,
    key TEXT NOT NULL,
    filename TEXT,
    mime_type TEXT,
    size INTEGER DEFAULT 0,
    url TEXT,
    storage_type TEXT DEFAULT 'r2' CHECK(storage_type IN ('r2','d1','local')),
    uploaded_at DATETIME DEFAULT (datetime('now')),
    expires_at DATETIME,
    deleted_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_fs_tenant ON file_storage(tenant_id, user_id, storage_type);
CREATE INDEX IF NOT EXISTS idx_fs_key ON file_storage(key);

-- 12. Developer Incomes
CREATE TABLE IF NOT EXISTS developer_incomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    developer_id INTEGER NOT NULL,
    user_id INTEGER,
    app_slug TEXT,
    amount_cents INTEGER NOT NULL,
    source TEXT CHECK(source IN ('app_sale','plugin_sale','template_sale','subscription')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','settled','refunded','disputed')),
    created_at DATETIME DEFAULT (datetime('now')),
    settled_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_di_dev ON developer_incomes(developer_id, status);

-- 13. Marketplace Orders
CREATE TABLE IF NOT EXISTS marketplace_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    buyer_user_id INTEGER,
    seller_developer_id INTEGER,
    app_slug TEXT,
    amount_cents INTEGER NOT NULL,
    platform_fee_cents INTEGER DEFAULT 0,
    seller_revenue_cents INTEGER,
    status TEXT CHECK(status IN ('pending','paid','completed','refunded','cancelled')),
    payment_method TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    paid_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_mo_order ON marketplace_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_mo_buyer ON marketplace_orders(buyer_user_id, status);

-- 14. Marketplace Reviews
CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    app_slug TEXT NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mr_app ON marketplace_reviews(app_slug);
CREATE INDEX IF NOT EXISTS idx_mr_user ON marketplace_reviews(user_id);

-- 15. AI Shares (public sharing)
CREATE TABLE IF NOT EXISTS ai_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER DEFAULT 1,
    owner_user_id INTEGER,
    resource_type TEXT CHECK(resource_type IN ('report','workflow','knowledge','template','agent','prompt')),
    resource_id INTEGER,
    public_link TEXT UNIQUE,
    access_type TEXT DEFAULT 'public' CHECK(access_type IN ('public','private','password','link')),
    password TEXT,
    expires_at DATETIME,
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_share_link ON ai_shares(public_link);