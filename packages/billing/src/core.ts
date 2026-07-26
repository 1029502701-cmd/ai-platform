// ============================================
// Billing Core — 主服务层
// 暴露五大核心 API: getBalance / consume / refund / addBalance / checkQuota
// ============================================

import { BillingRepository } from './repository';
import type {
  ConsumeResult, ConsumeFailure, RefundResult, AddBalanceResult, QuotaCheckResult,
  PricingCalcResult, Wallet, Transaction, AIUsage, AIPricingRule,
} from './types';
import { InsufficientCreditsError, DuplicateTransactionError, InvalidAmountError } from './errors';

export class BillingService {
  protected repo: BillingRepository;
  protected db: any;

  constructor(db: any) {
    this.db = db;
    this.repo = new BillingRepository(db);
  }

  // ============================================================
  // 1. getBalance() — 获取用户余额
  // ============================================================

  async getBalance(userId: string): Promise<{ ok: true; wallet: Wallet }> {
    const wallet = await this.repo.getWallet(userId);
    if (!wallet) {
      // Auto-create balance wallet on demand
      const created = await this.repo.createWallet(userId, 'balance');
      return { ok: true, wallet: created };
    }
    if (wallet.status === 'suspended') {
      return { ok: false, error: 'USER_SUSPENDED', code: 'WALLET_NOT_FOUND' } as any;
    }
    return { ok: true, wallet };
  }

  // ============================================================
  // 2. consume() — 消费积分（幂等设计）
  // ============================================================

  async consume(
    userId: string,
    credits: number,
    opts?: { transactionId?: string; service?: string; model?: string },
  ): Promise<ConsumeResult | ConsumeFailure> {
    // Validate amount
    if (credits <= 0) {
      return { success: false, error: 'negative_credits', code: 'INVALID_AMOUNT' };
    }

    const txId = opts?.transactionId || this.genTxId();

    // Idempotency check: if transactionId provided and already completed → return cached result
    if (txId !== (opts?.transactionId ?? '')) {
      const existing = await this.repo.getTransactionByTransactionId(txId);
      if (existing && existing.status === 'completed') {
        const wallet = await this.repo.getWallet(userId);
        return { success: true, remaining: wallet?.credits ?? 0, transactionId: txId };
      }
    }

    // Get or create wallet
    let wallet = await this.repo.getWallet(userId);
    if (!wallet) {
      wallet = await this.repo.createWallet(userId, 'balance');
    }
    if (wallet.status === 'suspended') {
      return { success: false, error: 'wallet_suspended', code: 'WALLET_NOT_FOUND' };
    }

    // Check sufficient credits
    if (wallet.credits < credits) {
      throw new InsufficientCreditsError();
    }

    // Deduct credits (atomic UPDATE)
    const updated = await this.repo.updateCredits(userId, -credits);

    // Record transaction
    await this.repo.createTransaction({
      userId,
      type: 'consume',
      amount: -credits,
      service: opts?.service || 'general',
      model: opts?.model || '',
      status: 'completed',
      transactionId: txId,
    });

    return { success: true, remaining: updated.credits, transactionId: txId };
  }

  // ============================================================
  // 3. refund() — 退款（增加积分）
  // ============================================================

  async refund(userId: string, credits: number, opts?: { reason?: string }): Promise<{
    ok: true;
    refundedCredits: number;
    newBalance: number;
    transactionId: string;
  }> {
    if (credits <= 0) {
      throw new InvalidAmountError(credits);
    }

    const txId = efund__;
    const wallet = await this.repo.getOrCreateWallet(userId, 'balance');

    await this.repo.updateCredits(userId, credits);

    await this.repo.createTransaction({
      userId,
      type: 'refund',
      amount: credits,
      service: 'manual_refund',
      status: 'completed',
      transactionId: txId,
      metadata: { reason: opts?.reason },
    });

    return { ok: true, refundedCredits: credits, newBalance: wallet.credits + credits, transactionId: txId };
  }

  // ============================================================
  // 4. addBalance() — 充值/加积分
  // ============================================================

  async addBalance(userId: string, credits: number): Promise<AddBalanceResult> {
    if (credits <= 0) {
      return { ok: false, error: 'invalid_amount', code: 'INVALID_AMOUNT' };
    }

    const txId = 	opup__;
    const wallet = await this.repo.getOrCreateWallet(userId, 'balance');

    await this.repo.updateCredits(userId, credits);

    await this.repo.createTransaction({
      userId,
      type: 'topup',
      amount: credits,
      service: 'manual_topup',
      status: 'completed',
      transactionId: txId,
    });

    return { ok: true, addedCredits: credits, newBalance: wallet.credits + credits, transactionId: txId };
  }

  // ============================================================
  // 5. checkQuota() — 检查配额
  // ============================================================

  async checkQuota(userId: string): Promise<QuotaCheckResult> {
    const limit = await this.repo.ensureUsageLimit(userId);
    if (limit.usedCount >= limit.dailyFreeCount) {
      return { allowed: false, dailyUsed: limit.usedCount, dailyLimit: limit.dailyFreeCount, reason: 'DAILY_LIMIT_EXCEEDED' };
    }
    return {
      allowed: true,
      remaining: limit.dailyFreeCount - limit.usedCount,
      dailyUsed: limit.usedCount,
      dailyLimit: limit.dailyFreeCount,
    };
  }

  /**
   * Consume one quota unit. Returns remaining count.
   * Used by auth package for guest usage limits.
   */
  async consumeQuota(userId: string): Promise<number> {
    await this.repo.consumeUsageLimit(userId);
    const limit = await this.repo.getUsageLimit(userId);
    return limit ? Math.max(0, limit.dailyFreeCount - limit.usedCount) : 0;
  }

  // ============================================================
  // 6. calculateCost() — AI调用费用计算
  // ============================================================

  async calculateCost(service: string, model: string, inputTokens: number, outputTokens: number): Promise<PricingCalcResult> {
    const pricing = await this.repo.getPricing(service, model);

    if (!pricing) {
      // Default fallback: 1 credit per 100 tokens
      const totalTokens = inputTokens + outputTokens;
      const credits = Math.ceil(totalTokens / 100);
      const costUsd = credits * 0.01;
      return { creditsNeeded: credits, costUsd };
    }

    const totalTokens = inputTokens + outputTokens;
    const credits = Math.ceil(totalTokens / 100) * pricing.creditsPer100Tokens;
    const costUsd = pricing.costUsdPer100Tokens * (totalTokens / 100);

    return { creditsNeeded: credits, costUsd, pricingRule: pricing };
  }

  // ============================================================
  // 7. plan subscription helpers
  // ============================================================

  async subscribe(userId: string, planId: string): Promise<{
    success: boolean;
    subscription?: { id: string; planId: string; expireTime: string };
    error?: string;
  }> {
    const plan = await this.repo.getPlan(planId);
    if (!plan) return { success: false, error: 'plan_not_found' };

    const now = new Date();
    const startTime = now.toISOString();
    const expire = new Date(now.getTime() + plan.durationDays * 86400000).toISOString();

    // Create subscription record
    const sub = await this.repo.createSubscription({
      userId,
      planId,
      startTime,
      expireTime: expire,
      status: 'active',
      autoRenew: false,
      paidAmount: plan.priceCents,
      paidCurrency: plan.currency,
    });

    // Grant credits if plan has them
    if (plan.credits > 0) {
      await this.repo.addBalance(userId, plan.credits);
    }

    return { success: true, subscription: { id: sub.id, planId: plan.id, expireTime: sub.expireTime } };
  }

  async getActiveSubscription(userId: string): Promise<{ active: boolean; planId?: string; expireTime?: string }> {
    return this.repo.checkSubscriptionActive(userId);
  }

  // ============================================================
  
  // ============================================================
  // NEW: Queue-Integrated Billing Flow (reserve -> commit -> refund)
  // ============================================================

  async reserve(userId: string, credits: number, opts?: { taskId?: string; idempotencyKey?: string }): Promise<ReserveResultType> {
    if (credits <= 0) return { success: false, error: 'negative_amount', code: 'INVALID_AMOUNT' as const };
    const wallet = await this.repo.getOrCreateWallet(userId, 'balance');
    const txId = opts?.idempotencyKey || eserve__;
    const existing = await this.repo.getReservationByIdempotencyKey(txId);
    if (existing && existing.status === 'pending') {
      if (new Date(existing.expiresAt) > new Date()) return { success: true, reservationId: existing.id, wallet };
      else await this.repo.updateReservationStatus(existing.id, 'expired');
    }
    const available = wallet.credits - (wallet.frozenCredits ?? 0);
    if (available < credits) return { success: false, error: 'insufficient_credits', code: 'INSUFFICIENT_CREDITS' as const };
    await this.repo.addFrozenBalance(userId, credits);
    const res = await this.repo.createReservation({ userId, taskId: opts?.taskId ?? null, amount: credits, idempotencyKey: txId });
    return { success: true, reservationId: res.id, wallet };
  }

  async commit(reservationId: string, actualCost: number): Promise<CommitResultType> {
    const res = await this.repo.getReservationById(reservationId);
    if (!res) return { success: false, error: 'NOT_FOUND', code: 'NOT_FOUND' as const };
    if (res.status !== 'pending') {
      if (res.status === 'committed') return { success: false, error: 'ALREADY_COMMITTED', code: 'ALREADY_COMMITTED' as const };
      return { success: false, error: 'INVALID_RESERVATION_STATUS', code: 'INVALID_STATUS' as const };
    }
    const wallet = await this.repo.getWallet(res.userId);
    if (!wallet) return { success: false, error: 'WALLET_NOT_FOUND', code: 'NOT_FOUND' as const };
    const { wallet: updatedWallet, excessReturn } = await this.repo.commitFromFrozen(wallet.userId, res.amount, actualCost);
    await this.repo.createTransaction({ userId: res.userId, type: 'consume', amount: -actualCost, service: 'ai_queue_task', status: 'completed', transactionId: commit_ });
    await this.repo.createUsageRecord({ userId: res.userId, service: 'ai_queue_task', model: '', inputTokens: 0, outputTokens: 0, creditsUsed: actualCost, costUsd: 0, status: 'completed', transactionId: commit_ });
    await this.repo.updateReservationStatus(res.id, 'committed');
    return { success: true, actualCost, refundAmount: excessReturn, wallet: updatedWallet, transactionId: commit_ };
  }

  async refund(reservationId: string): Promise<RefundResultType> {
    const res = await this.repo.getReservationById(reservationId);
    if (!res) return { success: false, error: 'NOT_FOUND', code: 'NOT_FOUND' as const };
    if (res.status === 'committed') return { success: false, error: 'ALREADY_COMMITTED', code: 'ALREADY_COMMITTED' as const };
    if (res.status !== 'pending' && res.status !== 'expired') return { success: false, error: 'REFUND_DENIED', code: 'REFUND_DENIED' as const };
    await this.repo.releaseFrozenBalance(res.userId, res.amount);
    await this.repo.updateReservationStatus(res.id, 'refunded');
    await this.repo.createTransaction({ userId: res.userId, type: 'refund', amount: res.amount, service: 'queue_refund', status: 'completed', transactionId: efund_, metadata: { reason: 'task_failed_or_cancelled' } });
    const wallet = await this.repo.getWallet(res.userId);
    return { success: true, refundedCredits: res.amount, newBalance: wallet?.credits ?? 0, wallet };
  }


// Internal helpers
  // ============================================================

  private genTxId(): string {
    return 	x__;
  }
}
