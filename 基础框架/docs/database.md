# Database Documentation

> Generated: 2026-07-27
> Source: `drizzle/schema.ts` + 37 SQL migration files
> Database Engine: Cloudflare D1 (SQLite)

---

## Connection Info

| Property | Value |
|----------|-------|
| Binding Name | `DB` |
| Database Name | `ai-platform-db` |
| Storage Engine | SQLite (via Cloudflare D1) |
| Total Tables | ~55 |
| Migration Version | 0037 (beauty_products) |

---

## Table Inventory

### User & Auth

#### `users`
> User master table. Email is legacy; new auth uses openid/unionid (WeChat).

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| id | TEXT | PK | — | UUID string |
| email | TEXT | — | NULL | Legacy, not used for login |
| password_hash | TEXT | — | NULL | Legacy password auth |
| role | TEXT | — | `'user'` | user / admin / developer |
| openid | TEXT | — | NULL | WeChat OpenID |
| unionid | TEXT | — | NULL | WeChat UnionID |
| nickname | TEXT | — | NULL | Display name |
| avatar | TEXT | — | NULL | Profile image URL |
| type | TEXT | — | `'guest'` | user / guest / wechat |
| status | TEXT | — | `'active'` | active / suspended / deleted |
| created_at | TEXT | — | — | ISO string |
| updated_at | TEXT | — | — | ISO string |

**Indexes:**
- `UNIQUE users_email_unique (email)` — optional unique constraint when email present

**Migration:** 0001 → 0016

---

#### `profiles`
> Extended user profile data.

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| user_id | TEXT | PK, FK→users.id | — | Cascade delete |
| display_name | TEXT | — | NULL | — |
| avatar_url | TEXT | — | NULL | — |
| image_url | TEXT | — | NULL | From 0003 |
| last_analysis_image | TEXT | — | NULL | From 0012 |
| locale | TEXT | — | `'zh-CN'` | — |
| timezone | TEXT | — | `'Asia/Shanghai'` | — |
| created_at | TEXT | — | — | — |
| updated_at | TEXT | — | — | — |

**Migration:** 0001 → 0004 → 0012

---

#### `user_sessions`
> Session management (JWT/cookie-based sessions).

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| id | TEXT | PK | — | — |
| user_id | TEXT | FK→users.id | — | Cascade delete |
| token | TEXT | — | NOT NULL | Session token |
| created_at | TEXT | — | — | — |
| expires_at | TEXT | — | NOT NULL | — |
| revoked_at | TEXT | — | NULL | When session revoked |

**Migrations:** 0002 → 0017

---

#### `user_settings`
> Per-user application settings.

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| (details in migration 0004) | — | — | — | Key-value settings |

---

#### `user_usage_limits`
> Free-tier usage quotas per user.

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| user_id | TEXT | PK, FK→users.id | — | Cascade delete |
| daily_free_count | INTEGER | — | 3 | Free AI calls/day |
| used_count | INTEGER | — | 0 | Count reset at reset_time |
| reset_time | TEXT | — | — | Next reset time |

**Migration:** 0018

---

### Core AI

#### `conversations`
> Chat conversations.

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| id | TEXT | PK | — | — |
| user_id | TEXT | FK→users.id | — | Cascade delete |
| title | TEXT | — | NULL | — |
| status | TEXT | — | `'active'` | active / archived |
| created_at | TEXT | — | — | — |
| updated_at | TEXT | — | — | — |

**Migration:** 0001

---

#### `messages`
> Individual chat messages within conversations.

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| id | TEXT | PK | — | — |
| conversation_id | TEXT | FK→conversations.id | — | Cascade delete |
| role | TEXT | — | NOT NULL | user / assistant / system |
| content | TEXT | — | NOT NULL | Message text |
| provider | TEXT | — | NULL | Model provider |
| model | TEXT | — | NULL | Model name |
| created_at | TEXT | — | — | — |

**Migration:** 0001

---

#### `ai_jobs`
> Legacy AI job tracking (superseded by ai_tasks).

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| id | TEXT | PK | — | — |
| user_id | TEXT | FK→users.id | — | Cascade delete |
| conversation_id | TEXT | FK→conversations.id | — | Set null on delete |
| type | TEXT | — | NOT NULL | Job type |
| status | TEXT | — | `'queued'` | queued / running / completed / failed |
| provider | TEXT | — | NULL | — |
| input_json | TEXT | — | `'{}'` | JSON |
| result_json | TEXT | — | NULL | JSON |
| error_code | TEXT | — | NULL | — |
| error_message | TEXT | — | NULL | — |
| attempts | INTEGER | — | 0 | Retry count |
| created_at | TEXT | — | — | — |
| started_at | TEXT | — | NULL | — |
| completed_at | TEXT | — | NULL | — |

**Migrations:** 0001 → 0010 → 0011

---

#### `ai_tasks`
> New AI task system (supersedes ai_jobs).

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| id | TEXT | PK | — | — |
| (detailed fields from migration 0010 + queue migrations) | — | — | — | Full queue-backed tasks |

**Migration:** 0010 + queue_indexes (0020)

---

#### `ai_providers`
> Registered AI provider configurations.

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| (provider configurations) | — | — | — | openai, deepseek, etc. |

**Migration:** 0005

---

#### `ai_models`
> Available AI models with routing config.

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| (model configurations) | — | — | — | provider, model_id, params, priority |

**Migrations:** 0005 → 0006 → fix_models

---

#### `ai_model_limits`
> Per-model usage limits.

**Migration:** 0006

---

#### `ai_scenarios`
> AI use case/scenario definitions.

**Migrations:** 0009 → 0025

---

### Agent Engine

#### `agents`
> Agent definitions and configurations.

**Migration:** 0027

#### `agent_tasks`
> Tasks assigned to agents.

**Migration:** 0027

#### `agent_memory`
> Long-term agent memory storage.

**Migration:** 0027

#### `agent_workflows`
> Workflow definitions for agent orchestration.

**Migration:** 0027

#### `agent_workflow_nodes`
> Nodes within agent workflows.

**Migration:** 0027

#### `agent_workflow_edges`
> Edges connecting workflow nodes.

**Migration:** 0027

---

### Billing & Payment

#### `wallets`
> User credit wallets.

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| (user wallets with balance tracking) | — | — | — | auto-created on demand |

**Migration:** 0021

---

#### `transactions`
> Transaction records (credit consumption/refund).

**Migration:** 0021

---

#### `billing_products`
> Products available for purchase.

**Migration:** 0029

---

#### `user_subscriptions`
> Active/past subscriptions.

**Migration:** 0029

---

#### `billing_orders`
> Payment orders.

**Migration:** 0029

---

#### `billing_transactions`
> Financial transaction records.

**Migration:** 0029

---

#### `billing_rules`
> Pricing rules (per-service, per-model).

**Migration:** 0029

---

#### `billing_reservations`
> Pre-frozen credit reservations.

**Migration:** 0019, 0029

---

#### `user_plans`
> Subscription plan definitions.

**Migration:** 0024

---

#### `user_plan_assignments`
> User-to-plan mapping.

**Migration:** 0024

---

#### `user_quotas`
> Per-user quota configurations.

**Migration:** 0024

---

#### `user_usage`
> Usage tracking (long-form).

**Migration:** 0024

---

### Knowledge Base

#### `knowledge_bases`
> Top-level knowledge base definitions.

**Migration:** 0008

#### `knowledge_documents`
> Documents within knowledge bases.

**Migration:** 0008

#### `knowledge_chunks`
> Text chunks for search.

**Migration:** 0008

#### `knowledge_embeddings`
> Vector embeddings for semantic search.

**Migration:** 0026

---

### Prompts

#### `prompts`
> Prompt templates.

**Migrations:** 0007 → 0023 (recreated)

#### `prompt_versions`
> Version history for prompts.

**Migrations:** 0007 → 0023 (recreated)

#### `ai_prompt_templates`
> Advanced prompt templates for AI scenarios.

**Migration:** 0025

---

### Production

#### `ai_results`
> Persisted AI generation results.

**Migration:** 0021

---

### Admin & System

#### `system_settings`
> Global system configuration (key-value).

**Migration:** 0023

---

#### `admin_roles`
> Admin-specific role definitions.

**Migration:** 0023

---

#### `roles`
> General RBAC roles.

**Migration:** 0003

#### `permissions`
> Permission definitions.

**Migration:** 0003 → 0023 (recreated)

#### `role_permissions`
> Role-permission mapping.

**Migration:** 0003 → 0023 (recreated)

#### `user_roles`
> User-role assignments.

**Migration:** 0003

#### `audit_logs`
> Security audit trail.

**Migration:** 0003

---

### Monitoring

#### `system_logs`
> System-wide logging.

**Migration:** 0022

#### `ai_call_logs`
> Detailed AI API call logs.

**Migration:** 0022

#### `ai_call_metrics`
> Aggregated AI performance metrics.

**Migration:** 0025

---

### Marketplace & Ecosystem

#### `marketplace_apps`
> Apps listed in the marketplace.

**Migration:** 0035

#### `marketplace_app_versions`
> Version history for marketplace apps.

**Migration:** 0035

#### `marketplace_app_installs`
> App installation records.

**Migration:** 0035

#### `marketplace_orders`
> Marketplace transaction orders.

**Migration:** 0035

#### `marketplace_reviews`
> User reviews for marketplace apps.

**Migration:** 0035

#### `developer_incomes`
> Revenue sharing for developers.

**Migration:** 0035

---

### Plugin System

#### `plugins`
> Registered plugins (manifest data).

**Migration:** 0035

#### `plugin_versions`
> Plugin version history.

**Migration:** 0035

#### `templates`
> Reusable templates.

**Migration:** 0035

#### `workflows_marketplace`
> Workflow templates for the marketplace.

**Migration:** 0035

#### `prompt_library`
> Community-shared prompt library.

**Migration:** 0035

---

### Open Platform

#### `developers`
> Developer accounts/organizations.

**Migration:** 0034

#### `api_keys`
> API keys for third-party access.

**Migration:** 0034

#### `api_usage`
> API key usage tracking.

**Migration:** 0034

#### `webhooks`
> Webhook endpoint configurations.

**Migration:** 0034

#### `webhook_logs`
> Webhook delivery logs.

**Migration:** 0034

---

### Integration

#### `integration_connections`
> Connected third-party integrations.

**Migration:** 0035

#### `notifications`
> In-app notification system.

**Migration:** 0035

#### `file_storage`
> File storage metadata.

**Migration:** 0035

---

### Security & Compliance

#### `backup_records`
> Database backup tracking.

**Migration:** 0031

#### `security_events`
> Security event log.

**Migration:** 0031

---

### Multi-Tenant

#### `tenants`
> Tenant organization definitions.

**Migration:** 0032

#### `tenant_domains`
> Custom domains per tenant.

**Migration:** 0032

#### `user_sessions_tenant`
> Tenant-scoped session isolation.

**Migration:** 0032

---

### Feature Management

#### `feature_flags`
> Feature toggle definitions.

**Migration:** 0033

---

### Beauty Module

#### `beauty_reports`
> Beauty analysis reports.

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| id | TEXT | PK | — | — |
| user_id | TEXT | FK→users.id | — | Cascade delete |
| report_json | TEXT | — | NULL | JSON report data |
| share_image_url | TEXT | — | NULL | Share poster URL |
| created_at | TEXT | — | — | — |
| updated_at | TEXT | — | — | — |

**Migrations:** 0001 → 0013 (fix) → 0013a (share image)

---

#### `beauty_profiles`
> User beauty profile (face shape, style preferences).

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| id | TEXT | PK | — | — |
| user_id | TEXT | FK→users.id | — | Cascade delete |
| avatar_url | TEXT | — | NULL | — |
| current_face_shape | TEXT | — | NULL | — |
| current_eye_shape | TEXT | — | NULL | — |
| skin_info | TEXT | — | NULL | JSON |
| preferred_style | TEXT | — | NULL | — |
| favorite_colors | TEXT | — | NULL | JSON array |
| analysis_count | INTEGER | — | 0 | — |
| last_analysis_id | TEXT | FK→beauty_reports.id | — | Set null on delete |
| created_at | TEXT | — | — | — |
| updated_at | TEXT | — | — | — |

**Migrations:** 0014 → 0036

---

#### `beauty_analysis_history`
> Historical beauty analysis records.

| Column | Type | Key | Default | Notes |
|--------|------|-----|---------|-------|
| id | TEXT | PK | — | — |
| user_id | TEXT | FK→users.id | — | Cascade delete |
| report_id | TEXT | FK→beauty_reports.id | — | Set null on delete |
| image_url | TEXT | — | NULL | Analyzed image URL |
| face_analysis_json | TEXT | — | NULL | Raw face analysis |
| style_result | TEXT | — | NULL | Style recommendation |
| created_at | TEXT | — | — | — |

**Migration:** 0015 → 0036

---

#### `beauty_products`
> Beauty product database (skincare, makeup).

**Migration:** 0037

---

#### `beauty_bloggers`
> Beauty influencer/bloggers database.

**Migration:** 0037

---

## Entity Relationship Summary

```
users (1) ─── (1) profiles
users (1) ─── (*) conversations ─── (*) messages
users (1) ─── (*) ai_jobs        ← legacy
users (1) ─── (*) ai_tasks       ← new queue-backed
users (1) ─── (*) user_sessions
users (1) ─── (*) user_usage_limits
users (1) ─── (*) wallets
users (1) ─── (*) beauty_reports
users (1) ─── (*) beauty_profiles
users (1) ─── (*) beauty_analysis_history
beauty_reports (1) ─── (1) beauty_profiles.last_analysis_id

knowledge_bases (1) ─── (*) knowledge_documents ─── (*) knowledge_chunks
knowledge_documents (1) ─── (*) knowledge_embeddings

agents (1) ─── (*) agent_tasks
agents (1) ─── (*) agent_memory
agent_workflows (1) ─── (*) agent_workflow_nodes ─── (*) agent_workflow_edges

user_subscriptions (*) → billing_products (*)
billing_orders (*) → users (1)
billing_transactions (*) → users (1)

tenants (1) ─── (*) user_subscriptions  ← multi-tenant
tenants (1) ─── (*) wallets             ← multi-tenant
```

---

## Index Summary

Key indexes identified from migrations:

| Table | Index | Type | Source |
|-------|-------|------|--------|
| users | `users_email_unique(email)` | UNIQUE | 0001 |
| ai_tasks | various query indexes | BTREE | 0020 |
| wallets | userId primary | PK | 0021 |
| transactions | userId + createdAt | composite | 0021 |
| knowledge_chunks | document_id | BTREE | 0008 |
| knowledge_embeddings | vector index | — | 0026 |
| user_sessions | userId + expiresAt | composite | 0017 |
| billing_orders | userId + status | composite | 0029 |
| ai_call_logs | userId + date | composite | 0022 |

---

## Migration Status

| Status | Count |
|--------|-------|
| Applied migrations (0001–0037) | 37 |
| Placeholder/duplicate migrations (00xx_) | 3 |
| Fix migrations (fix_*) | 3 |
| Seed files | 2 |
| Combined run file | 1 |
| **Total SQL files** | **46** |

⚠️ The `drizzle/00_run_all_migrations.sql` combines all migrations into one file.
⚠️ Some migrations recreate tables that were previously defined (e.g., `prompts`, `permissions`).
