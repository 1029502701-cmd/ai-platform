import { BillingService } from './billing_service';
import { InsufficientCreditsError } from './billing_errors';

export type BillingContext = {
  transactionId?: string;
  credits?: number;
  service?: string;
  model?: string;
};

export class BillingMiddleware {
  svc: BillingService;
  db: any;
  constructor(db: any) {
    this.db = db;
    this.svc = new BillingService(db);
  }

  async beforeAIRequest(userId: string, service: string, model: string): Promise<BillingContext> {
    const { credits } = await this.svc.calculateCost(service, model, 0, 0);
    
    if (credits <= 0) {
      return { transactionId: undefined, credits: 0, service, model };
    }

    const balanceCheck = await this.svc.checkBalance(userId);
    const allowed = balanceCheck.credits >= credits;
    if (!allowed) {
      throw new InsufficientCreditsError();
    }
    const transactionId = 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    await this.svc.consumeCredits(userId, credits, transactionId);

    // Also record to unified billing_transactions for Task-015
    try {
      await this.recordUnifiedTransaction(userId, 'consume', credits, 'ai_request_pre_auth', { service, model, transactionId });
    } catch {}

    return { transactionId, credits, service, model };
  }

  async afterAIResponse(userId: string, service: string, model: string, inputTokens: number, outputTokens: number, tx?: BillingContext) {
    if (!tx || tx.credits === 0) return;
    const { credits, cost_usd } = await this.svc.calculateCost(service, model, inputTokens, outputTokens);
    await this.svc.createUsage(userId, {
      user_id: userId, service, model,
      input_tokens: inputTokens, output_tokens: outputTokens,
      credits_used: credits, cost_usd, status: 'completed',
      transaction_id: tx?.transactionId,
    } as any);

    // Log to unified system
    try {
      await this.recordUnifiedTransaction(userId, 'consume', credits, 'ai_usage', {
        service, model, inputTokens, outputTokens, costUsd: cost_usd,
      });
    } catch {}
  }

  async onFailure(userId: string, credits: number) {
    if (credits <= 0) return;
    try {
      await this.svc.refundCredits(userId, credits);
      await this.recordUnifiedTransaction(userId, 'refund', credits, 'ai_failure_refund', { service: 'refunded' });
    } catch (e) {
      console.error('[BillingMiddleware] refund failed', e);
    }
  }

  private async recordUnifiedTransaction(userId: string, txType: string, amountCents: number, reason: string, metadata?: Record<string, any>) {
    if (!this.db?.prepare) return;
    let parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      // For guest users or anonymous, skip unified logging
      return;
    }
    const metaStr = metadata ? JSON.stringify(metadata) : null;
    await this.db.prepare(
      "INSERT INTO billing_transactions (user_id, tx_type, amount_cents, reason, metadata) VALUES (?, '" + txType + "', ?, ?, ?)"
    ).bind(parsedUserId, amountCents, reason, metaStr).run().catch(() => {});
  }
}