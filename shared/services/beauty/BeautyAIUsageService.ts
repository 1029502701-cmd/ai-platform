import { D1Database } from '@cloudflare/workers-types';

export class BeautyAIUsageService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async recordUsage(userId: string | null | undefined, reportId: string, model: string, inputTokens: number, outputTokens: number, durationMs: number) {
    try {
      const usageId = 'au_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      await this.db.prepare(
        'INSERT INTO beauty_ai_usage (id, user_id, report_id, model, input_tokens, output_tokens, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        usageId,
        userId || null,
        reportId,
        model,
        inputTokens,
        outputTokens,
        durationMs
      ).run();
    } catch (error) {
      console.warn('AI usage tracking failed:', model);
    }
  }
}

export default BeautyAIUsageService;
