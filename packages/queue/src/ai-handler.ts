// ============================================
// AI Handler — bridge Queue + Billing + AI Core
// All tasks MUST go through this handler. No direct provider access.
// ============================================

import { QueueService } from './core';
import type { AITask, TaskHandler } from './types';

/**
 * Create an AI TaskHandler that all queue workers register.
 * This replaces any direct call to ai_core or providers.
 */
export function createAIHandler(env: any): TaskHandler {
  return {
    execute: async (task: AITask) => {
      // Auth is already enforced at API layer via auth middleware
      // Billing is enforced inside ai_core.generateViaCore() via BillingMiddleware
      const coreReq: Record<string, unknown> = {
        requestId: task.id,
        userId: task.userId || undefined,
      };

      if (task.payload && typeof task.payload === 'object') {
        const p = task.payload as Record<string, unknown>;
        coreReq.scenario = p.scenario;
        coreReq.aiRequest = { ...p };
        delete (coreReq.aiRequest as Record<string, unknown>).scenario;
      } else {
        coreReq.aiRequest = {};
      }

      try {
        // Import shared services AI Core — this is THE single entry point
        const coreModule = await import('../../shared/services/ai_core');
        const coreResult = await coreModule.generateViaCore(env, coreReq as any);

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
        return { success: false, error: e.message || 'HANDLER_ERROR' };
      }
    },
  };
}

/**
 * Factory: create a consumer with the AI handler pre-registered.
 * Usage:
 *   const queue = new QueueService(db);
 *   queue.registerHandler('ai.generate', createAIHandler(env));
 *   queue.startWorker('worker-1');
 */
export function createQueuedAIExecutor(env: any, maxConcurrency: number = 5) {
  const handler = createAIHandler(env);
  return handler;
}