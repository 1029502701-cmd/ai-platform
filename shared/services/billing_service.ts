import type { Wallet, AIUsage } from './billing_types';
import { BillingRepository } from './billing_repository';

export class BillingService {
  repo: BillingRepository;
  db: any;
  constructor(db: any) {
    this.db = db;
    this.repo = new BillingRepository(db);
  }

  async checkBalance(userId: string): Promise<Wallet> {
    let w = await this.repo.getWallet(userId);
    if (!w) {
      w = await this.repo.createWallet(userId);
    }
    return w;
  }

  async consumeCredits(userId: string, credits: number, transactionId?: string): Promise<{ success: boolean; remaining: number }> {
    if (credits <= 0) throw new Error('invalid_credits_amount');
    // Idempotency: if transactionId provided and exists, don't double charge
    if (transactionId) {
      const existing = await this.repo.getUsageByTransactionId(transactionId);
      if (existing) {
        // already processed
        return { success: true, remaining: (await this.checkBalance(userId)).credits };
      }
    }
    const wallet = await this.checkBalance(userId);
    if (wallet.credits < credits) throw new Error('insufficient_credits');
    // perform atomic update via repository
    const updated = await this.repo.updateCredits(userId, -credits);
    // record usage with transaction id if provided
    await this.repo.createUsageRecord({ user_id: userId, service: 'billing_consumption', model: '', input_tokens: 0, output_tokens: 0, credits_used: credits, cost_usd: 0, status: 'completed', transaction_id: transactionId });
    return { success: true, remaining: updated.credits };
  }

  async refundCredits(userId: string, credits: number): Promise<Wallet> {
    if (credits <= 0) throw new Error('invalid_credits_amount');
    const updated = await this.repo.updateCredits(userId, credits);
    // record negative usage or refund event as usage with negative credits_used
    await this.repo.createUsageRecord({ user_id: userId, service: 'billing_refund', model: '', input_tokens: 0, output_tokens: 0, credits_used: -credits, cost_usd: 0, status: 'completed' });
    return updated;
  }

  async calculateCost(service: string, model: string, inputTokens: number, outputTokens: number): Promise<{ credits: number; cost_usd: number }> {
    const pricing = await this.repo.getPricing(service, model);
    if (!pricing) {
      // default fallback: 1 credit per 100 tokens, $0.01 per credit
      const totalTokens = inputTokens + outputTokens;
      const credits = Math.ceil(totalTokens / 100);
      const cost_usd = credits * 0.01;
      return { credits, cost_usd };
    }
    // pricing.credits represents number of credits per unit? here interpret as credits per token chunk
    const totalTokens = inputTokens + outputTokens;
    // simple model: credits per 100 tokens = pricing.credits
    const credits = Math.ceil(totalTokens / 100) * pricing.credits;
    const cost_usd = (pricing.cost_usd) * (totalTokens / 100);
    return { credits, cost_usd };
  }

  async createUsage(_userId: string, usage: Omit<AIUsage, 'id' | 'created_at'>) {
    const rec = await this.repo.createUsageRecord(usage as any);
    return rec;
  }
}
