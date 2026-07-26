// AI Queue Repository - Data access layer for task queue

import type { AITask } from '../../types/queue';

export class AIQueueRepository {
  protected env: any;

  constructor(env: any) {
    this.env = env;
  }

  async createTask(task: AITask): Promise<string> {
    const db = this.env.DB;
    if (!db?.prepare) throw new Error('DB_NOT_AVAILABLE');
    await db.prepare(
      'INSERT INTO ai_tasks (id, type, status, priority, payload, result, retry_count, max_retry, next_run_at, locked_by, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      task.id, task.type, task.status, task.priority,
      task.payload ? JSON.stringify(task.payload) : null,
      task.result ? JSON.stringify(task.result) : null,
      task.retry_count || 0, task.max_retry ?? 3,
      task.next_run_at || null, null, task.created_by || null, task.created_at
    );
    return task.id;
  }

  async getTaskById(id: string): Promise<AITask | null> {
    const row = await this.env.DB.prepare('SELECT * FROM ai_tasks WHERE id = ?').get(id);
    return row ? this.mapRow(row) : null;
  }

  async lockNextPending(workerId: string): Promise<AITask | null> {
    const db = this.env.DB;
    const row = await db.prepare(
      \SELECT id FROM ai_tasks WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP)
       ORDER BY CASE priority WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END DESC, created_at ASC LIMIT 1\
    ).get();
    if (!row) return null;

    await db.prepare('UPDATE ai_tasks SET locked_by = ?, locked_at = CURRENT_TIMESTAMP WHERE id = ? AND locked_by IS NULL')
      .run(workerId, row.id);
    return this.getTaskById(row.id);
  }

  async markRunning(id: string, workerId: string): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE ai_tasks SET status = ?, started_at = CURRENT_TIMESTAMP, locked_by = ?, locked_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run('running', workerId, id);
  }

  async markSuccess(id: string, result: any): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE ai_tasks SET status = ?, result = ?, finished_at = CURRENT_TIMESTAMP, locked_by = NULL WHERE id = ?'
    ).run('success', JSON.stringify(result), id);
  }

  async markFailed(id: string, error: string, retryCount: number): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE ai_tasks SET status = ?, last_error = ?, retry_count = ? WHERE id = ?'
    ).run('failed', error, retryCount, id);
  }

  async markRetry(id: string, retryCount: number, nextRetryAt: string | null): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE ai_tasks SET retry_count = ?, next_retry_at = ?, status = ?, last_error = NULL WHERE id = ?'
    ).run(retryCount, nextRetryAt, 'pending', id);
  }

  async cancelTask(id: string): Promise<void> {
    await this.env.DB.prepare('UPDATE ai_tasks SET status = ? WHERE id = ?').run('cancelled', id);
  }

  async getStats(): Promise<Record<string, number>> {
    const totals = await this.env.DB.prepare("SELECT status, COUNT(*) as cnt FROM ai_tasks GROUP BY status").all();
    const stats: Record<string, number> = { total: 0 };
    (totals as any[]).forEach(r => { stats[r.status] = r.cnt; stats.total += r.cnt; });
    return stats;
  }

  private mapRow(row: any): AITask {
    return {
      id: row.id, type: row.type, status: row.status, priority: row.priority,
      payload: row.payload ? JSON.parse(row.payload) : undefined,
      result: row.result ? JSON.parse(row.result) : undefined,
      retry_count: row.retry_count, max_retry: row.max_retry,
      next_retry_at: row.next_retry_at, locked_by: row.locked_by, locked_at: row.locked_at,
      created_by: row.created_by, created_at: row.created_at,
      started_at: row.started_at, finished_at: row.finished_at, last_error: row.last_error,
    };
  }
}
