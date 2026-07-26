// ============================================
// Lock — 分布式任务锁 (防重复执行)
// Uses optimistic locking via ai_tasks.locked_by IS NULL constraint
// ============================================

import type { StaleTask } from './types';
import { QueueRepository } from './repository';

export class LockEngine {
  protected repo: QueueRepository;
  constructor(db: any) { this.repo = new QueueRepository(db); }

  async findClaimable(workerId: string): Promise<any | null> {
    return this.repo.claimTask(workerId);
  }

  async claimForWorker(taskId: string, workerId: string): Promise<number> {
    const res: any = await this.repo.db.prepare(
      'UPDATE ai_tasks SET locked_by = ?, locked_at = CURRENT_TIMESTAMP WHERE id = ? AND locked_by IS NULL'
    ).bind(workerId, taskId).run();
    return res?.changes ?? 0;
  }

  async unlock(taskId: string): Promise<void> {
    await this.repo.releaseLock(taskId);
  }

  async isLocked(taskId: string): Promise<{ locked: boolean; by: string | null }> {
    const s = await this.repo.getLockStatus(taskId);
    return { locked: !!s.lockedBy, by: s.lockedBy };
  }

  async findStaleLocked(maxAgeMs: number): Promise<StaleTask[]> {
    return this.repo.findStaleRunning(maxAgeMs);
  }

  async forceReleaseStale(maxAgeMs: number): Promise<number> {
    const stale = await this.findStaleLocked(maxAgeMs);
    for (const s of stale) {
      await this.unlock(s.id);
      await this.repo.forceResetToPending(s.id);
    }
    return stale.length;
  }
}

export function createLockEngine(db: any): LockEngine {
  return new LockEngine(db);
}