// ============================================
// Queue Worker — 任务执行器
// 集成 AI Core + Billing + Auth
// ============================================

import { QueueRepository } from './repository';
import type { AITask, TaskPriority, WorkerConfig } from './types';
import type { QueueHandler } from './core';

export class QueueWorker {
  protected repo: QueueRepository;
  protected env: any;
  readonly workerId: string;
  protected handlers: Map<string, QueueHandler> = new Map();
  protected pollingIntervalMs: number;
  protected running: boolean = false;
  protected concurrentTasks: number = 0;

  constructor(env: any, config?: Partial<WorkerConfig>) {
    this.env = env;
    this.repo = new QueueRepository(env.DB);
    this.workerId = config?.workerId || worker--;
    this.pollingIntervalMs = config?.pollingIntervalMs ?? 2000;
  }

  // Register task handler
  registerHandler(taskType: string, handler: QueueHandler): void {
    this.handlers.set(taskType, handler);
  }

  // Start the worker loop
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.running) {
      try {
        const task = await this.repo.claimTask(this.workerId);
        if (!task) {
          await this.sleep(this.pollingIntervalMs);
          continue;
        }
        await this.executeTask(task);
      } catch (e: any) {
        console.error([QueueWorker:] loop error:, e.message);
        await this.sleep(this.pollingIntervalMs);
      }
    }
  }

  stop() {
    this.running = false;
  }

  private async executeTask(task: AITask): Promise<void> {
    // Check concurrency limit
    if (this.concurrentTasks >= 10) {
      return;
    }
    this.concurrentTasks++;

    try {
      await this.repo.markRunning(task.id, this.workerId);
      const handler = this.handlers.get(task.type);
      if (handler) {
        const result = await handler.execute(task);
        if (result.success && result.data !== undefined) {
          await this.repo.markSuccess(task.id, result.data);
        } else {
          await this.handleFailure(task, result.error || 'PROCESS_FAILED');
        }
      } else {
        // No registered handler for this type — treat as unknown task type
        // In production this would be routed to ai_core handler
        throw new Error('NO_HANDLER_FOR_TASK_TYPE: ' + task.type);
      }
    } catch (e: any) {
      await this.handleFailure(task, e.message || 'UNKNOWN_ERROR');
    } finally {
      this.concurrentTasks--;
    }
  }

  private async handleFailure(task: AITask, errorMsg: string): Promise<void> {
    const currentRetry = task.retryCount ?? 0;
    const nextRetry = currentRetry + 1;
    const maxRetries = task.maxRetry ?? 3;

    if (nextRetry > maxRetries) {
      await this.repo.markFailed(task.id, errorMsg, nextRetry);
    } else {
      // Exponential backoff with jitter
      const baseBackoff = [10000, 30000, 300000][Math.min(nextRetry - 1, 2)] || 10000; // 10s, 30s, 5min
      const jitter = Math.random() * baseBackoff * 0.2; // +/- 10%
      const delayMs = baseBackoff + jitter;
      const nextRunAt = new Date(Date.now() + delayMs).toISOString();
      await this.repo.markRetry(task.id, nextRetry, nextRunAt);
      await this.repo.markFailed(task.id, errorMsg, nextRetry);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}