// ============================================
// ResultSaver — 保存 AI 任务结果到 ai_results 表
// ============================================

import type { AITask } from './types';

export class ResultSaver {
  protected db: any;

  constructor(db: any) { this.db = db; }

  /** Save execution result for an AI task */
  async save(taskId: string, userId: string, success: boolean, data?: unknown, error?: string): Promise<void> {
    const id = es__;
    const now = new Date().toISOString();
    const dataObj = data as Record<string, unknown>;

    // Extract token counts and model info
    const usage = (dataObj?.usage as Record<string, unknown>) ?? {};
    const promptTokens = Number(usage.prompt_tokens || usage.promptTokens || 0);
    const completionTokens = Number(usage.completion_tokens || usage.completionTokens || 0);

    await this.db.prepare(
      \INSERT INTO ai_results (id, task_id, user_id, service, model, input_tokens, output_tokens, credits_used, cost_usd, status, error_message, created_at) VALUES (?, ?, ?, 'ai_task', ?, ?, ?, ?, ?, ?, ?, ?)\
    ).bind(
      id, taskId, userId,
      dataObj?.model ?? '',
      promptTokens, completionTokens, 0, 0,
      success ? 'completed' : 'failed',
      error || null,
      now
    ).run();
  }
}

export function createResultSaver(db: any): ResultSaver {
  return new ResultSaver(db);
}