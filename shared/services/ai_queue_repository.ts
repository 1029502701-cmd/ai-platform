import type { AITask } from '../types/ai_queue';

export class AIQueueRepository {
  env: any;
  constructor(env: any) { this.env = env; }

  async createTask(task: AITask) {
    const sql = `INSERT INTO ai_tasks (id, type, status, priority, payload, result, retry_count, max_retry, next_run_at, locked_by, locked_at, created_by, created_at, started_at, finished_at, last_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await this.env.DB.prepare(sql).run(
      task.id,
      task.type,
      task.status,
      task.priority,
      task.payload ? JSON.stringify(task.payload) : null,
      task.result ? JSON.stringify(task.result) : null,
      task.retry_count || 0,
      task.max_retry || 3,
      task.next_run_at || null,
      task.locked_by || null,
      task.locked_at || null,
      task.created_by || null,
      task.created_at || null,
      task.started_at || null,
      task.finished_at || null,
      task.last_error || null
    );
    return task.id;
  }

  async getTaskById(id: string): Promise<AITask | null> {
    const row = await this.env.DB.prepare('SELECT * FROM ai_tasks WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapRowToTask(row);
  }

  async listTasks(_filter: any = {}, limit = 50) {
    // Basic listing; filters could be expanded
    const sql = 'SELECT * FROM ai_tasks';
    const rows = await this.env.DB.prepare(sql + ' LIMIT ?').all(limit);
    return rows.map((r: any) => this.mapRowToTask(r));
  }

  async updateTaskResult(id: string, result: any, status: string, lastError?: string) {
    await this.env.DB.prepare('UPDATE ai_tasks SET result = ?, status = ?, last_error = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(result), status, lastError || null, id);
  }

  async markRunning(id: string, workerId: string) {
    await this.env.DB.prepare('UPDATE ai_tasks SET status = ?, started_at = CURRENT_TIMESTAMP, locked_by = ?, locked_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('running', workerId, id);
  }

  async markPending(id: string, nextRunAt: string | null = null) {
    await this.env.DB.prepare('UPDATE ai_tasks SET status = ?, next_run_at = ?, locked_by = NULL, locked_at = NULL WHERE id = ?')
      .run('pending', nextRunAt, id);
  }

  async markFailed(id: string, lastError: string, retryCount: number) {
    await this.env.DB.prepare('UPDATE ai_tasks SET status = ?, last_error = ?, retry_count = ? WHERE id = ?')
      .run('failed', lastError, retryCount, id);
  }

  async markSuccess(id: string, result: any) {
    await this.env.DB.prepare('UPDATE ai_tasks SET status = ?, result = ?, finished_at = CURRENT_TIMESTAMP, locked_by = NULL, locked_at = NULL WHERE id = ?')
      .run('success', JSON.stringify(result), id);
  }

  async cancelTask(id: string) {
    await this.env.DB.prepare('UPDATE ai_tasks SET status = ? WHERE id = ?').run('cancelled', id);
  }

  async lockNextPending(workerId: string) {
    // Attempt to atomically claim a pending task for this worker
    // Note: D1 doesn't support RETURNING; emulate with select then update under optimistic approach
    // Order by priority: high > normal > low, then FIFO by created_at
    const row = await this.env.DB.prepare(
      "SELECT id FROM ai_tasks WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP) " +
      "ORDER BY CASE priority WHEN 'high' THEN 3 WHEN 'normal' THEN 2 WHEN 'low' THEN 1 ELSE 2 END DESC, created_at ASC LIMIT 1"
    ).get();
    if (!row) return null;
    const id = row.id;
    // Try to lock
    await this.env.DB.prepare('UPDATE ai_tasks SET locked_by = ?, locked_at = CURRENT_TIMESTAMP WHERE id = ? AND locked_by IS NULL').run(workerId, id);
    const locked = await this.env.DB.prepare('SELECT locked_by FROM ai_tasks WHERE id = ?').get(id);
    if (locked && locked.locked_by === workerId) return this.getTaskById(id);
    return null;
  }

  async getRetryableTasks(limit = 50) {
    const rows = await this.env.DB.prepare("SELECT * FROM ai_tasks WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP) ORDER BY CASE priority WHEN 'high' THEN 3 WHEN 'normal' THEN 2 WHEN 'low' THEN 1 ELSE 2 END DESC, created_at ASC LIMIT ?").all(limit);
    return rows.map((r: any) => this.mapRowToTask(r));
  }

  async markRetry(id: string, retryCount: number, nextRetryAt: string | null) {
    await this.env.DB.prepare('UPDATE ai_tasks SET retry_count = ?, next_retry_at = ?, status = ?, last_error = ? WHERE id = ?')
      .run(retryCount, nextRetryAt, 'pending', null, id);
  }

  // Admin query: list tasks with optional filters
  async listTasksWithFilters(filters: any = {}, limit = 50) {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
    if (filters.type) { conditions.push('type = ?'); params.push(filters.type); }
    if (filters.userId) { conditions.push('created_by = ?'); params.push(filters.userId); }
    let where = '';
    if (conditions.length) where = 'WHERE ' + conditions.join(' AND ');
    const sql = `SELECT * FROM ai_tasks ${where} ORDER BY CASE priority WHEN 'high' THEN 3 WHEN 'normal' THEN 2 WHEN 'low' THEN 1 ELSE 2 END DESC, created_at ASC LIMIT ?`;
    const rows = await this.env.DB.prepare(sql).all(limit, ...params);
    return rows.map((r: any) => this.mapRowToTask(r));
  }

  async getStats() {
    const totals: any = await this.env.DB.prepare("SELECT status, COUNT(*) as cnt FROM ai_tasks GROUP BY status").all();
    const stats: any = { total: 0, pending: 0, running: 0, success: 0, failed: 0, cancelled: 0 };
    totals.forEach((row: any) => {
      stats.total += row.cnt;
      if (row.status in stats) stats[row.status] = row.cnt;
    });
    return stats;
  }

  mapRowToTask(row: any): AITask {
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      priority: row.priority,
      payload: row.payload ? JSON.parse(row.payload) : undefined,
      result: row.result ? JSON.parse(row.result) : undefined,
      retry_count: row.retry_count,
      max_retry: row.max_retry,
      next_retry_at: row.next_retry_at,
      locked_by: row.locked_by,
      locked_at: row.locked_at,
      created_by: row.created_by,
      created_at: row.created_at,
      started_at: row.started_at,
      finished_at: row.finished_at,
      last_error: row.last_error
    };
  }
}
