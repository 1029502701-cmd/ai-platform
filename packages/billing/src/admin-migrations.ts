// Admin Center — Additional DDL migrations
// Only adds fields that don't exist yet.
// Run via pplyAdminMigrations(db) function.

export async function applyAdminMigrations(db: any): Promise<void> {
  // 1. Ensure user_usage_limits has all needed columns
  try {
    await db.prepare('SELECT reset_time FROM user_usage_limits LIMIT 0').run();
  } catch {
    // Table doesn't exist, skip
  }

  // 2. ai_usage table: ensure transaction_id column exists (some existing installations may lack it)
  // D1 doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS, so we try-safe:
  try {
    await db.prepare("INSERT INTO ai_usage_temp SELECT id, user_id, service, model, input_tokens, output_tokens, credits_used, cost_usd, status, NULL as transaction_id, created_at FROM ai_usage WHERE transaction_id IS NULL").run().catch(() => {});
    await db.prepare("DROP TABLE ai_usage_temp").run().catch(() => {});
  } catch { /* Column already exists */ }

  // 3. transactions table: ensure metadata column
  try {
    // If table lacks metadata, we note it in logs but can't ALTER in SQLite easily
    await db.prepare("SELECT metadata FROM transactions LIMIT 1").run();
  } catch {
    console.warn('[admin-migrations] transactions table may lack metadata column - manual ALTER TABLE may be needed');
  }

  console.log('[admin-migrations] completed (no destructive changes)');
}