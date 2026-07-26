// ============================================
// Queue Core — Unified entry point
// 暴露: add / get / process / retry / cancel + ai.executeTask()
// ============================================

import { QueueProducer } from './producer';
import { QueueConsumer } from './consumer';
import { QueueScheduler } from './scheduler';
import { RetryEngine } from './retry';
import { LockEngine } from './lock';
import { PriorityQueue, PRIORITY_SCORE } from './priority';
import { ResultSaver } from './result-saver';
import type { EnqueueParams, AITask, TaskPayload, QueueStats, QueueHandler, WorkerConfig } from './types';

export interface QueuedTaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute an AI task through the unified pipeline: Auth -> Billing -> Queue -> AI Core -> Provider.
 * This is the ONLY way AI tasks should be executed. Direct provider calls are prohibited.
 */
export async function executeTask(task: AITask, env: any): Promise<QueuedTaskResult> {
  if (!task.userId) return { success: false, error: 'NO_USER_ID' };

  try {
    // Import shared services AI Core — single entry point for all AI
    const aiCoreModule = await import('../../shared/services/ai_core');
    const generateViaCore = aiCoreModule.generateViaCore;

    const coreReq: Record<string, unknown> = {
      requestId: task.id,
      userId: task.userId,
      aiRequest: task.payload ?? {},
    };
    if (task.payload && typeof task.payload === 'object') {
      const p = task.payload as Record<string, unknown>;
      coreReq.scenario = p.scenario;
    }

    const coreResult = await generateViaCore(env, coreReq as any);

    // Save to ai_results table
    try {
      const saver = new ResultSaver(env.DB);
      await saver.save(
        task.id,
        task.userId,
        coreResult.ok,
        coreResult.data,
        coreResult.error
      );
    } catch (_) {}

    if (!coreResult.ok) {
      return { success: false, error: coreResult.error || 'AI_CORE_ERROR' };
    }

    const data = coreResult.data as Record<string, unknown> | undefined;
    return {
      success: true,
      data: {
        content: data?.content ?? null,
        model: data?.model ?? null,
        usage: data?.usage ?? null,
        timings: coreResult.timings,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'EXECUTION_ERROR' };
  }
}

/** Main QueueService — aggregates all sub-modules */
export class QueueService {
  producer: QueueProducer;
  consumer: QueueConsumer;
  scheduler: QueueScheduler;
  retry: RetryEngine;
  lock: LockEngine;
  priority: PriorityQueue;
  resultSaver: ResultSaver;

  constructor(db: any, config?: { worker?: Partial<WorkerConfig>; retry?: Record<string, unknown> }) {
    this.producer = new QueueProducer(db);
    this.consumer = new QueueConsumer(db, { maxConcurrentTasks: 10, timeoutMs: 300_000, ...(config?.worker ?? {}) });
    this.scheduler = new QueueScheduler(db, { intervalMs: 5000 });
    this.retry = new RetryEngine(db, config?.retry as any);
    this.lock = new LockEngine(db);
    this.priority = new PriorityQueue(db);
    this.resultSaver = new ResultSaver(db);
  }

  // --- Public API ---
  async add(params: EnqueueParams): Promise<string> {
    return this.producer.enqueue(params);
  }

  async get(id: string): Promise<AITask | null> {
    return this.producer.repo.getTaskById(id);
  }

  async list(filters?: { status?: string; userId?: string; limit?: number }): Promise<AITask[]> {
    return this.producer.repo.listTasks(filters ?? {});
  }

  async stats(): Promise<QueueStats> {
    return this.producer.repo.getStats();
  }

  async process(handler: QueueHandler, taskId: string): Promise<QueuedTaskResult> {
    return this.consumer.execute({ id: taskId } as AITask);
  }

  async retry(taskId: string, delayMs?: number): Promise<{ success: boolean; nextRunAt?: string }> {
    if (delayMs) return this.retry.manualRetry(taskId, delayMs);
    const task = await this.producer.repo.getTaskById(taskId);
    if (!task) return { success: false };
    return this.retry.scheduleRetry(taskId, task.retryCount);
  }

  async cancel(taskId: string): Promise<boolean> {
    await this.producer.repo.cancelTask(taskId);
    return true;
  }

  // --- Convenience ---
  enqueue(params: EnqueueParams): Promise<string> { return this.add(params); }

  registerHandler(type: string, handler: QueueHandler): void {
    this.consumer.registerHandler(type, handler);
  }

  startWorker(workerId?: string): Promise<void> {
    return this.consumer.runLoop(workerId);
  }

  stopWorker(): void { this.consumer.stop(); }

  async tickScheduler(): Promise<number> {
    const r = await this.scheduler.tick();
    return r.scheduled;
  }

  async cleanupStale(maxAgeMs: number): Promise<number> {
    let released = 0;
    released += await this.producer.repo.cleanupStalePending(maxAgeMs);
    released += await this.lock.forceReleaseStale(maxAgeMs);
    return released;
  }
}

/** Factory */
export function createQueueService(db: any, config?: any): QueueService {
  return new QueueService(db, config);
}