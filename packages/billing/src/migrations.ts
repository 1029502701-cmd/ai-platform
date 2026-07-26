// ============================================
// Billing Core — 数据库迁移脚本
// Run these against D1 or any SQLite-compatible DB
// ============================================

import type { Migration } from './types';

export const billingMigrations: Migration[] = [
  {
    version: 1,
    name: 'create_billing_tables',
    sql: [
      // Wallets table
      'CREATE TABLE IF NOT EXISTS wallets (' +
        'id TEXT PRIMARY KEY,' +
        'user_id TEXT NOT NULL UNIQUE,' +
        'credits INTEGER NOT NULL DEFAULT 0,' +
        'total_used INTEGER NOT NULL DEFAULT 0,' +
        'total_topped_up INTEGER NOT NULL DEFAULT 0,' +
        'mode TEXT NOT NULL DEFAULT '\''balance'\'',' +
        'status TEXT NOT NULL DEFAULT '\''active'\'',' +
        'created_at TEXT NOT NULL,' +
        'updated_at TEXT NOT NULL,' +
        'FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE' +
      ')',

      // Transactions table
      'CREATE TABLE IF NOT EXISTS transactions (' +
        'id TEXT PRIMARY KEY,' +
        'user_id TEXT NOT NULL,' +
        'type TEXT NOT NULL CHECK(type IN ('\''consume'\'','\''refund'\'','\''topup'\'','\''subscription_grant'\'','\''subscription_expire'\'','\''system_adjustment'\'')),' +
        'amount INTEGER NOT NULL,' +
        'service TEXT NOT NULL DEFAULT '\''general'\'',' +
        'model TEXT DEFAULT '\'',' +
        'input_tokens INTEGER NOT NULL DEFAULT 0,' +
        'output_tokens INTEGER NOT NULL DEFAULT 0,' +
        'credits_per_token REAL NOT NULL DEFAULT 0,' +
        'cost_usd REAL NOT NULL DEFAULT 0,' +
        'status TEXT NOT NULL DEFAULT '\''completed'\'',' +
        'transaction_id TEXT NOT NULL UNIQUE,' +
        'metadata TEXT,' +
        'created_at TEXT NOT NULL,' +
        'FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE' +
      ')',

      // AI Usage tracking
      'CREATE TABLE IF NOT EXISTS ai_usage (' +
        'id TEXT PRIMARY KEY,' +
        'user_id TEXT NOT NULL,' +
        'service TEXT NOT NULL,' +
        'model TEXT NOT NULL DEFAULT '\'',' +
        'input_tokens INTEGER NOT NULL DEFAULT 0,' +
        'output_tokens INTEGER NOT NULL DEFAULT 0,' +
        'credits_used INTEGER NOT NULL DEFAULT 0,' +
        'cost_usd REAL NOT NULL DEFAULT 0,' +
        'status TEXT NOT NULL DEFAULT '\''completed'\'',' +
        'transaction_id TEXT,' +
        'created_at TEXT NOT NULL,' +
        'FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE' +
      ')',

      // Pricing rules for different AI models/services
      'CREATE TABLE IF NOT EXISTS ai_pricing (' +
        'id TEXT PRIMARY KEY,' +
        'service TEXT NOT NULL,' +
        'model TEXT NOT NULL,' +
        'credits_per_100_tokens INTEGER NOT NULL DEFAULT 1,' +
        'cost_usd_per_100_tokens REAL NOT NULL DEFAULT 0.01,' +
        'enabled INTEGER NOT NULL DEFAULT 1,' +
        'priority INTEGER NOT NULL DEFAULT 0,' +
        'created_at TEXT NOT NULL,' +
        'UNIQUE(service, model)' +
      ')',

      // Quota / rate limit rules
      'CREATE TABLE IF NOT EXISTS quota_rules (' +
        'id TEXT PRIMARY KEY,' +
        'name TEXT NOT NULL,' +
        'description TEXT,' +
        'scope TEXT NOT NULL CHECK(scope IN ('\''user'\'','\''role'\'','\''global'\'')),' +
        'scope_target TEXT NOT NULL,' +
        'rule_type TEXT NOT NULL CHECK(rule_type IN ('\''daily_limit'\'','\''monthly_limit'\'','\''concurrent_limit'\'','\''rate_limit'\'')),' +
        'limit INTEGER NOT NULL,' +
        'period_start TEXT,' +
        'used INTEGER NOT NULL DEFAULT 0,' +
        'created_by TEXT,' +
        'created_at TEXT NOT NULL,' +
        'updated_at TEXT NOT NULL' +
      ')',

      // Plans (subscription tiers)
      'CREATE TABLE IF NOT EXISTS plans (' +
        'id TEXT PRIMARY KEY,' +
        'name TEXT NOT NULL,' +
        'price_cents INTEGER NOT NULL,' +
        'currency TEXT NOT NULL DEFAULT '\''CNY'\'',' +
        'credits INTEGER NOT NULL DEFAULT 0,' +
        'duration_days INTEGER NOT NULL DEFAULT 30,' +
        'enabled INTEGER NOT NULL DEFAULT 1,' +
        'features TEXT DEFAULT '\'{}'\'',' +
        'created_at TEXT NOT NULL' +
      ')',
    ],
  },
];

/**
 * Apply all pending migrations in order.
 */
export async function applyBillingMigrations(db: any): Promise<void> {
  // Check which migration tables already exist
  const tablesExist = await db.prepare(
    \"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('wallets','transactions','ai_usage','ai_pricing','quota_rules','plans')\"
  ).all();

  const existingTables = new Set((tablesExist as any[]).map((r: any) => r.name));

  if (existingTables.size >= 6) {
    return; // All tables exist, skip
  }

  for (const mig of billingMigrations) {
    for (const sql of mig.sql) {
      try {
        await db.prepare(sql).run().catch(() => {});
      } catch (e: any) {
        // Table may already exist - skip
        if (!e.message?.includes('UNIQUE') && !e.message?.includes('duplicate')) {
          throw e;
        }
      }
    }
  }
}
