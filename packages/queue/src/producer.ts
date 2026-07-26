// ============================================
// Producer — 任务入队 (queue.add)
// ============================================

import { v4 as uuidv4 } from 'uuid';
import type { EnqueueParams, EnqueueResult, AITask } from './types';
import { QueueRepository } from './repository';

const PRIORITY_ORDER: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };

export class QueueProducer {
  protected repo: QueueRepository;

  constructor(db: any) {
    this.repo = new QueueRepository(db);
  }

  /**
   * Add a task to the queue. This is the main entry point: queue.add().
   */
  async enqueue(params: EnqueueParams): Promise<EnqueueResult> {
    const taskId = 	q__;
    const now = new Date().toISOString();

    // Handle scheduleAfter: if set, next_run_at = now + delay
    let nextRunAt: string | null = null;
    if (params.scheduleAfter && params.scheduleAfter > 0) {
      nextRunAt = new Date(Date.now() + params.scheduleAfter).toISOString();
    }

    await this.repo.createTask({
      id: taskId,
      type: params.type,
      priority: params.priority || 'normal',
      userId: params.userId,
      payload: params.payload,
      maxRetry: params.maxRetry ?? 3,
      createdById: null,
      nextRunAt,
    });

    return { taskId, status: 'queued' };
  }

  /**
   * Batch enqueue multiple tasks at once.
   */
  async enqueueBatch(paramsList: EnqueueParams[]): Promise<EnqueueResult[]> {
    const results: EnqueueResult[] = [];
    for (const p of paramsList) {
      const result = await this.enqueue(p);
      results.push(result);
    }
    return results;
  }

  /**
   * Schedule a delayed task — adds it with a future nextRunAt.
   */
  async schedule(params: Omit<EnqueueParams, 'scheduleAfter'> & { delayMs: number }): Promise<EnqueueResult> {
    return this.enqueue({ ...params, scheduleAfter: params.delayMs });
  }

  /**
   * Priority scoring for sorting (used internally by lock mechanism).
   */
  static scorePriority(priority: string): number {
    return PRIORITY_ORDER[priority] ?? PRIORITY_ORDER.normal;
  }

  /**
   * Compatibility bridge: wrap existing AIQueueService.submitTask signature.
   */
  async submitAdaptive(params: { type: string; payload?: any; priority?: string; userId?: string | null; maxRetry?: number }): Promise<string> {
    const result = await this.enqueue({
      type: params.type,
      payload: params.payload,
      priority: (params.priority as 'low'|'normal'|'high'|'urgent') || 'normal',
      userId: params.userId ?? null,
      maxRetry: params.maxRetry ?? 3,
    });
    return result.taskId;
  }
}

/** Factory — create a producer bound to a D1 database */
export function createProducer(db: any): QueueProducer {
  return new QueueProducer(db);
}