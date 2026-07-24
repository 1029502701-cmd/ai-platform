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
      const coreResp = await generateViaCore(this.env, { aiRequest: task.payload, userId });
      if (coreResp.ok) {
        result = coreResp.data;
        await this.service.markSuccess(task.id, result);
      } else {
        // treat as failure
        const err = coreResp.error || 'ai_core_error';
        await this.onTaskFailure(task, err);
      }
    } catch (e: any) {
      await this.onTaskFailure(task, e?.message || 'worker_error');
    }
  }

  async onTaskFailure(task: AITask, errorMsg: string) {
    const nextRetry = (task.retry_count || 0) + 1;
    if (nextRetry > (task.max_retry || 3)) {
      // mark failed permanently
      await this.service.markFailed(task.id, errorMsg, nextRetry);
    } else {
      // schedule retry with exponential backoff
      const backoffMs = Math.min(60_000, Math.pow(2, nextRetry) * 1000); // cap 60s
      const nextRunAt = new Date(Date.now() + backoffMs).toISOString();
      await this.service.reschedule(task.id, nextRunAt);
      // update retry_count
      await this.service.markFailed(task.id, errorMsg, nextRetry);
    }
  }

  sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
}
