// ============================================
// Billing Middleware — 计费中间件
// 集成到 AI Core 的请求/响应流程中
// ============================================

import { BillingService } from './core';
import { InsufficientCreditsError } from './errors';
import type { BillingContext, PreRequestResult } from './types';

export class BillingMiddleware {
  protected svc: BillingService;

  constructor(db: any) {
    this.svc = new BillingService(db);
  }

  /**
   * beforeAIRequest — 在AI调用前扣费
   */
  async beforeAIRequest(userId: string, service: string, model: string): Promise<BillingContext> {
    // Calculate estimated cost
    const { credits: estCredits } = await this.svc.calculateCost(service, model, 0, 0);

    // Check wallet balance (will auto-create if needed)
    const balance = await this.svc.getBalance(userId);
    if (!balance.ok) throw new Error('WALLET_CREATION_FAILED');

    // If balance is 0, check if user is guest with free quota
    if (balance.wallet.credits === 0 && estCredits > 0) {
      const quota = await this.svc.checkQuota(userId);
      if (!quota.allowed) {
        throw new InsufficientCreditsError();
      }
      // Guest: consume one free quota unit
      await this.svc.consumeQuota(userId);
      return { transactionId: this.genTxId(), credits: 0, service, model };
    }

    // Consume estimated credits for pre-payment
    await this.svc.consume(userId, estCredits, { transactionId: this.genTxId(), service, model });
    return {
      transactionId: illing_pre_,
      credits: estCredits,
      service,
      model,
    };
  }

  /**
   * afterAIResponse — AI响应后结算（精确扣费）
   */
  async afterAIResponse(userId: string, service: string, model: string, inputTokens: number, outputTokens: number, tx?: BillingContext): Promise<void> {
    // Calculate exact cost
    const { credits, cost_usd } = await this.svc.calculateCost(service, model, inputTokens, outputTokens);

    // Create usage record
    await this.svc['repo'].createUsageRecord({
      userId,
      service,
      model,
      inputTokens,
      outputTokens,
      creditsUsed: credits,
      costUsd: cost_usd,
      status: 'completed',
      transactionId: tx?.transactionId,
    } as any);
  }

  /**
   * onFailure — AI调用失败时退款
   */
  async onFailure(userId: string, credits: number): Promise<void> {
    try {
      await this.svc.refund(userId, credits, { reason: 'ai_call_failed' });
    } catch (e: any) {
      console.error('[BillingMiddleware] refund failed on failure:', e.message);
    }
  }

  private genTxId(): string {
    return 	x__;
  }
}
