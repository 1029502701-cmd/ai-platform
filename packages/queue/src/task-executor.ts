// ============================================
// TaskExecutor — 统一AI任务执行器
// 桥接 Queue (生产者) + Billing (消费者配额检查) + AI Core (执行者)
// 这是 queue -> ai executeTask() 的实现
// ============================================

import { generateViaCore } from '../../shared/services/ai_core';
import type { AITask, TaskHandler } from './types';

/** Execute an AI task using the unified pipeline: Auth -> Billing -> Queue -> AI Core -> Provider */
export async function executeAITask(task: AITask, env: any): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!task.userId) {
    return { success: false, error: 'TASK_NO_USER_ID' };
  }

  const requestId = task.id || generateRequestId();
  const startTime = Date.now();

  try {
    // Call shared services AI Core — this already includes billing middleware and usage limit check
    // We do NOT call ai_core directly; everything goes through generateViaCore which is the single entry point.
    const coreResult = await generateViaCore(env, {
      requestId,
      userId: task.userId,
      scenario: (task.payload as any)?.scenario,
      aiRequest: task.payload ?? {},
    });

    if (!coreResult.ok) {
      return { success: false, error: coreResult.error || 'AI_CORE_ERROR' };
    }

    // Save result to ai_results table via repo
    const resultData = coreResult.data as any;
    return {
      success: true,
      data: {
        requestId: coreResult.requestId,
        content: resultData?.content ?? null,
        model: resultData?.model ?? null,
        provider: resultData?.provider ?? null,
        usage: resultData?.usage ?? null,
        timings: coreResult.timings,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'EXECUTION_ERROR' };
  }
}

/** Execute an AI task asynchronously via queue — no direct call to providers */
export class AIExecuteTask implements TaskHandler {
  protected env: any;
  protected maxConcurrency: number;
  constructor(env: any, maxConcurrency: number = 5) {
    this.env = env;
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * ai.executeTask(task) — This is the single entry point ALL tasks must go through.
   * Business apps CANNOT call Provider directly.
   */
  async execute(task: AITask): Promise<{ success: boolean; data?: unknown; error?: string }> {
    // Enforce concurrency limit (simple counter for demo)
    if (this.maxConcurrency > 0 && this.currentExecutions >= this.maxConcurrency) {
      // In production this would use a semaphore / throttling queue
      throw new Error('CONCURRENCY_LIMIT_EXCEEDED');
    }
    this.currentExecutions++;
    try {
      return await executeAITask(task, this.env);
    } finally {
      this.currentExecutions--;
    }
  }

  private currentExecutions = 0;
}

function generateRequestId(): string {
  return eq__;
}