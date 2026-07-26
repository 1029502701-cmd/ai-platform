// Queue System — Database Migrations
// Add ai_results table and ensure ai_tasks has all needed columns

export const queueMigrations = [
  {
    version: 1,
    name: 'create_ai_results_table',
    sql: [
      // AI results table — stores detailed output per task
      'CREATE TABLE IF NOT EXISTS ai_results (' +
        'id TEXT PRIMARY KEY,' +
        'task_id TEXT NOT NULL,' +
        'user_id TEXT NOT NULL,' +
        'service TEXT NOT NULL,' +
        'model TEXT NOT NULL DEFAULT '\'''\',' +
        'input_tokens INTEGER NOT NULL DEFAULT 0,' +
        'output_tokens INTEGER NOT NULL DEFAULT 0,' +
        'credits_used INTEGER NOT NULL DEFAULT 0,' +
        'cost_usd REAL NOT NULL DEFAULT 0,' +
        'status TEXT NOT NULL DEFAULT '\''completed'\'',' +
        'error_message TEXT,' +
        'created_at TEXT NOT NULL,' +
        'FOREIGN KEY(task_id) REFERENCES ai_tasks(id)' +
      ')',
    ],
  },
];

/** Apply queue-specific migrations */
export async function applyQueueMigrations(db: any): Promise<void> {
  // Check if ai_results exists
  try {
    await db.prepare('SELECT id FROM ai_results LIMIT 1').run();
    return; // table already exists
  } catch {
    // Create the table
    for (const mig of queueMigrations) {
      for (const sql of mig.sql) {
        try { await db.prepare(sql).run(); } catch { /* likely CREATE IF NOT EXISTS */ }
      }
    }
  }
}