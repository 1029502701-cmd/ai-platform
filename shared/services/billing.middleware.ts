import { BillingService } from './billing.service';
import { InsufficientCreditsError } from './billing.errors';

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
    // calculate cost (credits)
    const { credits } = await this.svc.calculateCost(service, model, 0, 0);
    const balanceCheck = await this.svc.checkBalance(userId);
    const allowed = balanceCheck.credits >= credits;
    if (!allowed) {
      throw new InsufficientCreditsError();
    }
    // generate a transaction id here; service consumer may pass its own
    const transactionId = `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
    // consume credits with transaction id for idempotency
    await this.svc.consumeCredits(userId, credits, transactionId);
    return { transactionId, credits, service, model };
  }

  async afterAIResponse(userId: string, service: string, model: string, inputTokens: number, outputTokens: number, tx?: BillingContext) {
    // calculate actual cost
    const { credits, cost_usd } = await this.svc.calculateCost(service, model, inputTokens, outputTokens);
    // create usage record
    await this.svc.createUsage(userId, { user_id: userId, service, model, input_tokens: inputTokens, output_tokens: outputTokens, credits_used: credits, cost_usd, status: 'completed', transaction_id: tx?.transactionId } as any);
  }

  async onFailure(userId: string, credits: number) {
    // refund credits
    try {
      await this.svc.refundCredits(userId, credits);
    } catch (e) {
      // log and swallow
      console.error('[BillingMiddleware] refund failed', e);
    }
  }
}
