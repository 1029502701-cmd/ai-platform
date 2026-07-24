import { AIQueueRepository } from './ai_queue_repository';
import { QueueConfig } from '../config/queue';

export class QueueMaintenanceService {
  repo: AIQueueRepository;
  env: any;
  constructor(env: any) { this.env = env; this.repo = new AIQueueRepository(env); }

  // Cleanup tasks that have been pending longer than STALE_PENDING_MS or running longer than STALE_RUNNING_MS
  async cleanupStaleTasks() {
    const now = Date.now();
    const stalePendingThreshold = new Date(now - QueueConfig.STALE_PENDING_MS).toISOString();
    const staleRunningThreshold = new Date(now - QueueConfig.STALE_RUNNING_MS).toISOString();

    // Mark very old pending tasks as archived (or failed) - choose archived
    await this.env.DB.prepare("UPDATE ai_tasks SET status = 'archived', last_error = 'stale_pending' WHERE status = 'pending' AND created_at <= ?")
      .run(stalePendingThreshold);

    // Mark running tasks that have exceeded threshold as failed
    await this.env.DB.prepare("UPDATE ai_tasks SET status = 'failed', last_error = 'stale_running', finished_at = CURRENT_TIMESTAMP WHERE status = 'running' AND started_at <= ?")
      .run(staleRunningThreshold);

    return { archived_before: stalePendingThreshold, failed_running_before: staleRunningThreshold };
  }

  async getHealth() {
    const row = await this.env.DB.prepare("SELECT status, COUNT(*) AS cnt FROM ai_tasks GROUP BY status").all();
    const stats: any = { pending: 0, running: 0, success: 0, failed: 0, cancelled: 0, archived: 0, total: 0 };
    row.forEach((r: any) => {
      stats[r.status] = r.cnt;
      stats.total += r.cnt;
    });
    return stats;
  }
}
