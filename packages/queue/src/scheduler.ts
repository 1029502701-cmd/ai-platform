// ============================================
// Scheduler — 定时任务调度 (delayed enqueue)
// ============================================

import type { QueueStats } from './types';
import { QueueRepository } from './repository';

export class QueueScheduler {
  protected repo: QueueRepository;
  protected running = false;
  protected intervalMs: number;

  constructor(db: any, config?: { intervalMs?: number }) {
    this.repo = new QueueRepository(db);
    this.intervalMs = config?.intervalMs ?? 5_000; // tick every 5s
  }

  /**
   * Start periodic scheduling. Scans for tasks with nextRunAt <= now and flips them to pending.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.running) {
      try {
        await this.tick();
      } catch (e: any) {
        console.error('[QueueScheduler] tick error:', e.message);
      }
      await this.sleep(this.intervalMs);
    }
  }

  stop(): void {
    this.running = false;
  }

  /**
   * Single tick: find due tasks and release them.
   */
  async tick(): Promise<{ scheduled: number }> {
    const now = new Date().toISOString();
    const rows: any[] = await this.repo.findDueTasks(now);
    for (const row of rows) {
      await this.repo.releaseScheduled(row.id);
    }
    return { scheduled: rows.length };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}

/** Factory */
export function createScheduler(db: any): QueueScheduler {
  return new QueueScheduler(db);
}