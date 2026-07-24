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
  constructor(db: any) {
    this.svc = new BillingService(db);
  }

  async beforeAIRequest(userId: string, service: string, model: string) : Promise<BillingContext> {
    const { credits } = await this.svc.calculateCost(service, model, 0, 0);
    
    // Allow zero-cost requests (e.g., local testing with mock models that have no pricing config)
    if (credits <= 0) {
      return { transactionId: null, credits: 0, service, model };
    }

    const balanceCheck = await this.svc.checkBalance(userId);
    const allowed = balanceCheck.credits >= credits;
    if (!allowed) {
      throw new InsufficientCreditsError();
    }
    const transactionId = 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    await this.svc.consumeCredits(userId, credits, transactionId);
    return { transactionId, credits, service, model };
  }

  async afterAIResponse(userId: string, service: string, model: string, inputTokens: number, outputTokens: number, tx?: BillingContext) {
    if (!tx || tx.credits === 0) return;
    const { credits, cost_usd } = await this.svc.calculateCost(service, model, inputTokens, outputTokens);
    await this.svc.createUsage(userId, { user_id: userId, service, model, input_tokens: inputTokens, output_tokens: outputTokens, credits_used: credits, cost_usd, status: 'completed', transaction_id: tx?.transactionId } as any);
  }

  async onFailure(userId: string, credits: number) {
    if (credits <= 0) return;
    try {
      await this.svc.refundCredits(userId, credits);
    } catch (e) {
      console.error('[BillingMiddleware] refund failed', e);
    }
  }
}
