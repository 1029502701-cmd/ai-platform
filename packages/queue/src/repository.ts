// ============================================
// Queue Repository — DB operations for ai_tasks
// Compatible with DDL from drizzle/0010_ai_tasks.sql + 0011_ai_tasks_retry.sql
// ============================================

export class QueueRepository {
  protected db: any;
  constructor(db: any) { this.db = db; }

  // ===== Task CRUD =====

  async createTask(task: any): Promise<string> {
    const now = new Date().toISOString();
    await this.db.prepare(
      \INSERT INTO ai_tasks (id, type, status, priority, user_id, payload, result, retry_count, max_retry, locked_by, locked_at, next_run_at, created_by, created_at, started_at, finished_at, last_error)
       VALUES (?, ?, 'pending', ?, ?, null, 0, ?, null, null, ?, ?, ?, null, null, null)\
    ).bind(task.id, task.type, task.priority, task.userId ?? null, task.payload ? JSON.stringify(task.payload) : null, task.maxRetry ?? 3, task.nextRunAt || null, task.createdById ?? null, now).run();
    return task.id;
  }

  async getTaskById(id: string): Promise<any | null> {
    const row = await this.db.prepare('SELECT * FROM ai_tasks WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapRow(row);
  }

  async listTasks(filters: { status?: string; userId?: string; limit?: number } = {}): Promise<any[]> {
    const cond: string[] = [];
    const params: any[] = [];
    if (filters.status) { cond.push('status = ?'); params.push(filters.status); }
    if (filters.userId) { cond.push('user_id = ?'); params.push(filters.userId); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const sql = \SELECT * FROM ai_tasks \ ORDER BY CASE priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END DESC, created_at ASC LIMIT ?\;
    const rows = await this.db.prepare(sql).bind(...params, filters.limit ?? 50).all();
    return ((rows as any[]) || []).map((r: any) => this.mapRow(r));
  }

  // ===== Lock / Claim =====

  async claimTask(workerId: string): Promise<any | null> {
    const row = await this.db.prepare(
      \SELECT id FROM ai_tasks WHERE (status = 'pending' OR status = 'retrying') AND (next_run_at IS NULL OR next_run_at <= CURRENT_TIMESTAMP) AND locked_by IS NULL ORDER BY CASE priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END DESC, created_at ASC LIMIT 1\
    ).get();
    if (!row) return null;
    const res: any = await this.db.prepare('UPDATE ai_tasks SET locked_by = ?, locked_at = CURRENT_TIMESTAMP WHERE id = ? AND locked_by IS NULL').bind(workerId, row.id).run();
    if (!res?.changes) return null;
    return this.getTaskById(row.id);
  }

  async markRunning(taskId: string, workerId: string): Promise<void> {
    await this.db.prepare('UPDATE ai_tasks SET status = ?, started_at = CURRENT_TIMESTAMP, locked_by = ? WHERE id = ?').bind('running', workerId, taskId).run();
  }

  async releaseLock(taskId: string): Promise<void> {
    await this.db.prepare('UPDATE ai_tasks SET locked_by = NULL, locked_at = NULL WHERE id = ?').bind(taskId).run();
  }

  async forceResetToPending(taskId: string): Promise<void> {
    await this.db.prepare('UPDATE ai_tasks SET status = ?, locked_by = NULL, locked_at = NULL WHERE id = ?').bind('pending', taskId).run();
  }

  async getLockStatus(taskId: string): Promise<{ lockedBy: string | null }> {
    const row = await this.db.prepare('SELECT locked_by FROM ai_tasks WHERE id = ?').get(taskId);
    return { lockedBy: row?.locked_by ?? null };
  }

  // ===== Scheduling =====

  async findDueTasks(before: string): Promise<any[]> {
    const rows = await this.db.prepare(\SELECT id FROM ai_tasks WHERE status = 'pending' AND next_run_at IS NOT NULL AND next_run_at <= ?\).bind(before).all();
    return ((rows as any[]) || []);
  }

  async releaseScheduled(taskId: string): Promise<void> {
    await this.db.prepare('UPDATE ai_tasks SET next_run_at = NULL WHERE id = ?').bind(taskId).run();
  }

  // ===== Retry / Fail / Success =====

  async markSuccess(taskId: string, result: any): Promise<void> {
    await this.db.prepare('UPDATE ai_tasks SET status = ?, result = ?, finished_at = CURRENT_TIMESTAMP, locked_by = NULL WHERE id = ?').bind('success', JSON.stringify(result), taskId).run();
  }

  async markFailed(taskId: string, error: string, retryCount: number): Promise<void> {
    await this.db.prepare('UPDATE ai_tasks SET status = ?, last_error = ?, retry_count = ?, finished_at = CURRENT_TIMESTAMP, locked_by = NULL WHERE id = ?').bind('failed', error, retryCount, taskId).run();
  }

  async markRetry(taskId: string, retryCount: number, nextRunAt: string | null): Promise<void> {
    await this.db.prepare('UPDATE ai_tasks SET status = ?, retry_count = ?, next_run_at = ?, locked_by = NULL, locked_at = NULL, last_error = NULL WHERE id = ?').bind('retrying', retryCount, nextRunAt, taskId).run();
  }

  async cancelTask(taskId: string): Promise<void> {
    await this.db.prepare('UPDATE ai_tasks SET status = ?, locked_by = NULL, finished_at = CURRENT_TIMESTAMP WHERE id = ?').bind('cancelled', taskId).run();
  }

  // ===== Priority =====

  async updateTaskPriority(taskId: string, priority: string): Promise<void> {
    await this.db.prepare('UPDATE ai_tasks SET priority = ? WHERE id = ?').bind(priority, taskId).run();
  }

  // ===== Stats =====

  async getStats(): Promise<any> {
    const rows = await this.db.prepare(\"SELECT status, COUNT(*) as cnt FROM ai_tasks GROUP BY status\").all();
    const s: Record<string, number> = { total: 0 };
    ((rows as any[]) || []).forEach((r: any) => { s[r.status] = Number(r.cnt); s.total += Number(r.cnt); });
    return s;
  }

  // ===== Stale Cleanup =====

  async findStalePending(maxAgeMs: number): Promise<any[]> {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const rows = await this.db.prepare(\SELECT id, type, locked_by, locked_at, started_at FROM ai_tasks WHERE status = 'pending' AND created_at < ? AND (locked_by IS NOT NULL OR locked_at IS NOT NULL)\).bind(cutoff).all();
    return ((rows as any[]) || []).map((r: any) => ({ ...r, staleReason: 'stale_pending' as const }));
  }

  async findStaleRunning(maxAgeMs: number): Promise<any[]> {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const rows = await this.db.prepare(\SELECT id, type, locked_by, locked_at, started_at FROM ai_tasks WHERE status = 'running' AND started_at < ?\).bind(cutoff).all();
    return ((rows as any[]) || []).map((r: any) => ({ ...r, staleReason: 'stale_running' as const }));
  }

  async cleanupStalePending(maxAgeMs: number): Promise<number> {
    const stale = await this.findStalePending(maxAgeMs);
    for (const s of stale) await this.forceResetToPending(s.id);
    return stale.length;
  }

  // ===== Helper =====

  private mapRow(row: any): any {
    return {
      id: row.id, type: row.type, status: row.status, priority: row.priority,
      userId: row.user_id, payload: row.payload ? JSON.parse(row.payload) : null,
      result: row.result ? JSON.parse(row.result) : null,
      retryCount: row.retry_count, maxRetry: row.max_retry,
      lockedBy: row.locked_by, lockedAt: row.locked_at, nextRunAt: row.next_run_at,
      createdById: row.created_by, createdAt: row.created_at,
      startedAt: row.started_at, finishedAt: row.finished_at, lastError: row.last_error,
    };
  }
}