// ============================================
// Consumer — 任务出队与执行 (queue.get / queue.process)
// ============================================

import type { AITask, PollResult, ClaimedTask, TaskHandler, WorkerConfig } from './types';
import { QueueRepository } from './repository';

export class QueueConsumer {
  protected repo: QueueRepository;
  protected handlers: Map<string, TaskHandler> = new Map();
  protected config: Required<WorkerConfig>;

  constructor(db: any, config?: Partial<WorkerConfig>) {
    this.repo = new QueueRepository(db);
    this.config = {
      workerId: (config?.workerId || 'default'),
      pollingIntervalMs: config?.pollingIntervalMs ?? 2000,
      maxConcurrentTasks: config?.maxConcurrentTasks ?? 10,
      timeoutMs: config?.timeoutMs ?? 300_000,
    };
  }

  /** Register a handler for a specific task type */
  registerHandler(type: string, handler: TaskHandler): void {
    this.handlers.set(type, handler);
  }

  /** Get the handler for a task type (returns null if none registered) */
  getHandler(type: string): TaskHandler | null {
    return this.handlers.get(type) || null;
  }

  /**
   * poll() — consumer side: claim next available task.
   * This is the core of queue.process(): pull work from the queue.
   */
  async poll(workerId: string): Promise<PollResult> {
    // Acquire lock to prevent race with other consumers
    await this.lock.acquire();

    try {
      const task = await this.repo.claimTask(workerId);
      if (!task) return { found: false };
      return { found: true, task, workerId };
    } finally {
      this.lock.release();
    }
  }

  /**
   * Execute a single claimed task using the registered handler.
   * Returns the execution result and updates the DB accordingly.
   */
  async execute(task: AITask): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const handler = this.handlers.get(task.type);
    if (!handler) {
      // Unknown type — mark as failed
      throw new Error(NO_HANDLER_FOR_TYPE: );
    }

    // Mark running in DB
    await this.repo.markRunning(task.id, this.config.workerId);

    // Enforce execution timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TASK_TIMEOUT')), this.config.timeoutMs);
    });

    try {
      const executionPromise = handler.execute(task);
      const result = await Promise.race([executionPromise, timeoutPromise]);
      if (result.success && result.data !== undefined) {
        await this.repo.markSuccess(task.id, result.data);
        return { success: true, data: result.data };
      }
      throw new Error(result.error || 'EXECUTION_FAILED');
    } catch (e: any) {
      await this.repo.markFailed(task.id, e.message || 'UNKNOWN_ERROR', task.retryCount + 1);
      return { success: false, error: e.message || 'UNKNOWN_ERROR' };
    }
  }

  /**
   * runLoop — start consuming tasks continuously.
   * This is what QueueWorker.start() calls internally.
   */
  async runLoop(workerId?: string): Promise<void> {
    const wid = workerId || this.config.workerId;
    let running = true;

    while (running) {
      try {
        const result = await this.poll(wid);
        if (!result.found) {
          await this.sleep(this.config.pollingIntervalMs);
          continue;
        }
        await this.execute(result.task!);
      } catch (e: any) {
        console.error([QueueConsumer:] loop error:, e.message);
        await this.sleep(this.config.pollingIntervalMs);
      }
    }
  }

  stop(): void {
    // No-op; caller sets external flag or process exits
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  // Simple semaphore for claiming
  private lock = {
    _acquired: false,
    acquire(): Promise<void> {
      return new Promise((resolve) => {
        const tryAcquire = () => {
          if (!this._acquired) {
            this._acquired = true;
            resolve();
          } else {
            setTimeout(tryAcquire, 1);
          }
        };
        tryAcquire();
      });
    },
    release(): void { this._acquired = false; }
  };
}

/** Factory — create a consumer bound to D1 */
export function createConsumer(db: any, config?: Partial<WorkerConfig>): QueueConsumer {
  return new QueueConsumer(db, config);
}