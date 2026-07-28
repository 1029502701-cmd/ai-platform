# Database Review

## Date: 2026-07-27
## D1 Database: ai-platform-db (ID: 23b19cc8-...)

### Migration File Inventory

| Category | Count | Files |
|----------|-------|-------|
| Numbered SQL migrations | 44 | ``0001_initial.sql``, ``0002_auth_sessions.sql``, ``0003_roles_permissions.sql``, ``0004_add_profile_image.sql``, ``0004_user_settings.sql``, ``0005_ai_providers_models.sql``, ``0006_ai_model_limits.sql``, ``0007_prompts.sql``, ``0008_knowledge.sql``, ``0009_ai_scenarios.sql``, ``0010_ai_tasks.sql``, ``0011_ai_tasks_retry.sql``, ``0012_add_profile_last_analysis_image.sql``, ``0013_add_report_share_image.sql``, ``0013_fix_beauty_reports.sql``, ``0014_add_beauty_profile_fields.sql``, ``0015_create_beauty_analysis_history.sql``, ``0016_modify_users_add_auth_fields.sql``, ``0017_create_user_sessions.sql``, ``0018_create_user_usage_limits.sql``, ``0019_billing_reservations.sql``, ``0020_queue_indexes.sql``, ``0021_production_tables.sql``, ``0022_monitoring_tables.sql``, ``0023_admin_console.sql``, ``0024_user_system.sql``, ``0025_ai_engine.sql``, ``0026_knowledge_embeddings.sql``, ``0027_agent_engine.sql``, ``0028_db_optimization.sql``, ``0029_billing_platform.sql``, ``0030_billing_indexes.sql``, ``0031_security_compliance.sql``, ``0032_multi_tenant.sql``, ``0033_feature_flags.sql``, ``0034_open_platform.sql``, ``0035_ecosystem.sql``, ``0036_beauty_integration.sql``, ``0037_beauty_products.sql``, ``0037_beauty_products_seed.sql``, ``00_run_all_migrations.sql``, ``00xx_admin_operation_log.sql``, ``00xx_create_billing_tables.sql``, ``00xx_plan_features_and_seed.sql`` |
| Fix scripts | 3 | ``fix_deepseek_params.sql``, ``fix_models.sql``, ``fix_users_fk.sql`` |
| Seed scripts | 1 | ``seed_ai_scenarios.sql`` |
| Aggregation file | 1 | `00_run_all_migrations.sql` (YES) |

### Drizzle ORM Schema

Defined tables in `drizzle/schema.ts`:

| # | Table Name | Source |
|---|-----------|--------|
| 1 | `users` | sqliteTable |
| 2 | `profiles` | sqliteTable |
| 3 | `conversations` | sqliteTable |
| 4 | `messages` | sqliteTable |
| 5 | `aiJobs` | sqliteTable |
| 6 | `beauty_reports` | sqliteTable |
| 7 | `beauty_profiles` | sqliteTable |
| 8 | `beauty_analysis_history` | sqliteTable |
| 9 | `user_sessions` | sqliteTable |
| 10 | `user_usage_limits` | sqliteTable |

**Note**: Only 10 tables are defined in the Drizzle schema.
However, SQL migrations define many additional tables (billing, audit logs, feature flags,
prompts, knowledge base, etc.). This is a **schema drift** — migrations should be synchronized
with `drizzle/schema.ts` using `drizzle-kit push` or `drizzle-kit generate`.

### Merged SQL Content

| Metric | Value |
|--------|-------|
| Total CREATE TABLE statements | 35 |
| Total CREATE INDEX statements | 24 |
| INSERT/ALTER/PRAGMA statements | ~7 |

### Potential Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
| Medium | **Schema Drift** | Only 10/30+ tables reflected in drizzle/schema.ts |
| Low | **00xx_ files exist** | 3 files with '00xx_' prefix may be abandoned duplicates: `00xx_admin_operation_log.sql`, `00xx_create_billing_tables.sql`, `00xx_plan_features_and_seed.sql` |
| Low | **Fix scripts** | 3 `fix_*.sql` files are ad-hoc patches, not ordered migrations |

### Recommendations

1. Run `drizzle-kit generate --name sync-schema` after all migrations are applied to bring schema.ts up to date.
2. Remove or mark as deprecated the 00xx_* fix scripts if their content is already applied.
3. Keep the aggregation file (`00_run_all_migrations.sql`) as the single source of truth for migrations.

---
*This review does not modify any database. It documents the current state only.*
