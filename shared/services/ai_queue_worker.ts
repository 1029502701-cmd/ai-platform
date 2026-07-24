import { AIQueueService } from './ai_queue_service';
import { generateViaCore } from './ai_core';
import type { AITask } from '../types/ai_queue';

export class AIQueueWorker {
  service: AIQueueService;
  env: any;
  workerId: string;
  pollingIntervalMs: number;
  running: boolean = false;

  constructor(env: any, workerId?: string, pollingIntervalMs = 2000) {
    this.env = env;
    this.workerId = workerId || `worker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    this.service = new AIQueueService(env);
    this.pollingIntervalMs = pollingIntervalMs;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    while (this.running) {
      try {
        const task = await this.service.fetchNextForWorker(this.workerId);
        if (!task) {
          await this.sleep(this.pollingIntervalMs);
          continue;
        }
        // Basic protection: if task is in an unexpected state, skip
        if (task.status !== 'pending') {
          console.warn(`[AIQueueWorker] skipping task ${task.id} in unexpected state ${task.status}`);
          await this.sleep(100);
          continue;
        }
        await this.handleTask(task);
      } catch (e: any) {
        // Log and continue
        try { console.error('[AIQueueWorker] loop error', e?.message || e); } catch {};
        await this.sleep(this.pollingIntervalMs);
      }
    }
  }

  stop() {
    this.running = false;
  }

  async handleTask(task: AITask) {
    // Mark running
    await this.service.markRunning(task.id, this.workerId);
    // Execute via AI Core
    let result: any = null;
    try {
      // task.payload expected to be AIRequest-like
      const userId = typeof task.created_by === 'string' ? task.created_by : undefined;
      // Enforce execution timeout based on QueueConfig
      const { QueueConfig } = await import('./../config/queue');
      const execPromise = generateViaCore(this.env, { aiRequest: task.payload, userId });
      const timeoutMs = QueueConfig.TASK_EXECUTION_TIMEOUT_MS;
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('task_timeout')), timeoutMs));
      try {
        const coreRespRaw = await Promise.race([execPromise, timeoutPromise]);
        const coreResp: any = coreRespRaw as any;
        if (coreResp && coreResp.ok) {
          result = coreResp.data;
          await this.service.markSuccess(task.id, result);
        } else {
          const err = (coreResp && coreResp.error) ? coreResp.error : 'ai_core_error';
          await this.onTaskFailure(task, err);
        }
      } catch (err: any) {
        // timeout or other error
        const msg = err?.message || 'worker_error';
        await this.onTaskFailure(task, msg);
      }
    } catch (e: any) {
      await this.onTaskFailure(task, e?.message || 'worker_error');
    }
  }

  async onTaskFailure(task: AITask, errorMsg: string) {
    const currentRetry = task.retry_count ?? 0;
    const nextRetry = currentRetry + 1;
    if (nextRetry > (task.max_retry ?? 3)) {
      // mark failed permanently
      await this.service.markFailed(task.id, errorMsg, nextRetry);
    } else {
      // schedule retry with defined backoff strategy: 1st -> 10s, 2nd -> 30s, 3rd -> 5min
      let backoffMs = 10000; // default 10s
      if (nextRetry === 2) backoffMs = 30000;
      else if (nextRetry >= 3) backoffMs = 5 * 60 * 1000;
      const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
      // mark retry: update retry_count and next_retry_at and set status back to pending
      await this.service.markRetry(task.id, nextRetry, nextRetryAt);
      // record last error as failed attempt
      await this.service.markFailed(task.id, errorMsg, nextRetry);
    }
  }

  sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
}
