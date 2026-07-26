// ============================================
// Billing Core — Repository 层
// 所有数据库操作集中在这一层
// ============================================

import type {
  Wallet, Transaction, AIUsage, AIPricingRule,
  QuotaRule, Plan, Subscription, UsageLimit,
} from './types';

export class BillingRepository {
  protected db: any;

  constructor(db: any) {
    this.db = db;
  }

  // ==================== Wallet ====================

  async getWallet(userId: string): Promise<Wallet | null> {
    const row = await this.db.prepare('SELECT * FROM wallets WHERE user_id = ?').bind(userId).first<any>();
    if (!row) return null;
    return this.mapWallet(row);
  }

  async createWallet(
    userId: string, mode: 'balance' | 'points' | 'package' = 'balance',
  ): Promise<Wallet> {
    const now = new Date().toISOString();
    const id = w__;
    await this.db.prepare(
      'INSERT INTO wallets (id, user_id, credits, total_used, total_topped_up, mode, status, created_at, updated_at) VALUES (?, ?, 0, 0, 0, ?, ?, ?, ?)'
    ).bind(id, userId, mode, 'active', now, now).run();
    return { id, userId, credits: 0, totalUsed: 0, totalToppedUp: 0, mode, status: 'active', createdAt: now, updatedAt: now };
  }

  async updateCredits(userId: string, delta: number): Promise<Wallet> {
    const now = new Date().toISOString();
    const absDelta = Math.abs(delta);
    const sign = delta >= 0 ? 1 : -1;

    await this.db.prepare(
      UPDATE wallets SET credits = credits + ?, total_used = total_used + ?, total_topped_up = total_topped_up + ?, updated_at = ? WHERE user_id = ?
    ).bind(delta, Math.max(0, -delta), Math.max(0, delta), now, userId).run();

    const wallet = await this.getWallet(userId);
    if (!wallet) throw new Error('WALLET_NOT_FOUND_AFTER_UPDATE');
    return wallet;
  }

  async getOrCreateWallet(userId: string, mode?: 'balance' | 'points' | 'package'): Promise<Wallet> {
    let wallet = await this.getWallet(userId);
    if (!wallet) {
      wallet = await this.createWallet(userId, mode ?? 'balance');
    }
    return wallet;
  }

  // ==================== Transactions ====================

  async createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const now = new Date().toISOString();
    const id = 	x__;
    await this.db.prepare(
      INSERT INTO transactions (id, user_id, type, amount, service, model, input_tokens, output_tokens, credits_per_token, cost_usd, status, transaction_id, metadata, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ).bind(
      id, tx.userId, tx.type, tx.amount, tx.service, tx.model ?? '',
      tx.inputTokens ?? 0, tx.outputTokens ?? 0, tx.creditsPerToken ?? 0, tx.costUsd ?? 0,
      tx.status, tx.transactionId, tx.metadata ? JSON.stringify(tx.metadata) : null, now
    ).run();
    return { id, createdAt: now, ...tx } as Transaction;
  }

  async getTransactionByTransactionId(transactionId: string): Promise<Transaction | null> {
    const row = await this.db.prepare('SELECT * FROM transactions WHERE transaction_id = ? LIMIT 1').bind(transactionId).first<any>();
    if (!row) return null;
    return { ...row, metadata: row.metadata ? JSON.parse(row.metadata) : undefined } as Transaction;
  }

  // ==================== AI Usage ====================

  async createUsageRecord(u: Omit<AIUsage, 'id' | 'createdAt'>): Promise<AIUsage> {
    const now = new Date().toISOString();
    const id = u.id ?? usage_;
    await this.db.prepare(
      INSERT INTO ai_usage (id, user_id, service, model, input_tokens, output_tokens, credits_used, cost_usd, status, transaction_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ).bind(id, u.userId, u.service, u.model, u.inputTokens, u.outputTokens, u.creditsUsed, u.costUsd, u.status, u.transactionId ?? null, now).run();
    return { id, createdAt: now, ...u } as AIUsage;
  }

  async listUsageByUser(userId: string, limit = 50): Promise<AIUsage[]> {
    const rows = await this.db.prepare('SELECT * FROM ai_usage WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').bind(userId, limit).all();
    return ((rows as any)?.results || []).map((r: any) => ({ ...r, createdAt: r.created_at }));
  }

  // ==================== Pricing ====================

  async getPricing(service: string, model: string): Promise<AIPricingRule | null> {
    const row = await this.db.prepare(
      SELECT * FROM ai_pricing WHERE service = ? AND model = ? AND enabled = 1 ORDER BY priority DESC LIMIT 1
    ).bind(service, model).first<any>();
    if (!row) return null;
    return this.mapPricing(row);
  }

  async setPricing(rule: Omit<AIPricingRule, 'id' | 'createdAt'>): Promise<AIPricingRule> {
    const id = price_;
    const now = new Date().toISOString();
    await this.db.prepare(
      INSERT OR REPLACE INTO ai_pricing (id, service, model, credits_per_100_tokens, cost_usd_per_100_tokens, enabled, priority, created_at) VALUES (?,?,?,?,?,?,?,?)
    ).bind(id, rule.service, rule.model, rule.creditsPer100Tokens, rule.costUsdPer100Tokens, rule.enabled ? 1 : 0, rule.priority, now).run();
    return { ...rule, id, createdAt: now } as AIPricingRule;
  }

  async listPricing(): Promise<AIPricingRule[]> {
    const rows = await this.db.prepare('SELECT * FROM ai_pricing ORDER BY priority DESC').all();
    return ((rows as any)?.results || []).map((r: any) => this.mapPricing(r));
  }

  // ==================== Quota Rules ====================

  async getQuotaRule(id: string): Promise<QuotaRule | null> {
    const row = await this.db.prepare('SELECT * FROM quota_rules WHERE id = ?').bind(id).first<any>();
    return row ? this.mapQuotaRule(row) : null;
  }

  async listQuotaRules(scope?: QuotaRule['scope']): Promise<QuotaRule[]> {
    const sql = scope
      ? 'SELECT * FROM quota_rules WHERE scope = ? ORDER BY created_at DESC'
      : 'SELECT * FROM quota_rules ORDER BY created_at DESC';
    const rows = await this.db.prepare(sql).bind(scope || '').all();
    return ((rows as any)?.results || []).map((r: any) => this.mapQuotaRule(r));
  }

  // ==================== Plans ====================

  async getPlan(planId: string): Promise<Plan | null> {
    const row = await this.db.prepare('SELECT * FROM plans WHERE id = ?').bind(planId).first<any>();
    if (!row) return null;
    return { ...row, features: row.features ? JSON.parse(row.features) : {} } as Plan;
  }

  async listPlans(enabledOnly = true): Promise<Plan[]> {
    const sql = enabledOnly ? 'SELECT * FROM plans WHERE enabled = 1 ORDER BY price_cents ASC' : 'SELECT * FROM plans ORDER BY price_cents ASC';
    const rows = await this.db.prepare(sql).all();
    return ((rows as any)?.results || []).map((r: any) => ({ ...r, features: r.features ? JSON.parse(r.features) : {} })) as Plan[];
  }

  async createPlan(p: Omit<Plan, 'id' | 'createdAt'>): Promise<Plan> {
    const id = plan_;
    const now = new Date().toISOString();
    await this.db.prepare(
      INSERT INTO plans (id, name, price_cents, currency, credits, duration_days, enabled, features, created_at) VALUES (?,?,?,?,?,?,?,?,?)
    ).bind(id, p.name, p.priceCents, p.currency, p.credits, p.durationDays, p.enabled ? 1 : 0, JSON.stringify(p.features), now).run();
    return { ...p, id, createdAt: now } as Plan;
  }

  // ==================== Subscriptions ====================

  async createSubscription(sub: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription> {
    const id = sub_;
    const now = new Date().toISOString();
    await this.db.prepare(
      INSERT INTO subscriptions (id, user_id, plan_id, start_time, expire_time, status, auto_renew, paid_amount, paid_currency, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)
    ).bind(id, sub.userId, sub.planId, sub.startTime, sub.expireTime, sub.status, sub.autoRenew ? 1 : 0, sub.paidAmount, sub.paidCurrency, now).run();
    return { ...sub, id, createdAt: now } as Subscription;
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const row = await this.db.prepare(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(userId, 'active').first<any>();
    return row ? { ...row, createdAt: row.created_at } as Subscription : null;
  }

  async checkSubscriptionActive(userId: string): Promise<{ active: boolean; planId?: string; expireTime?: string }> {
    const sub = await this.getUserSubscription(userId);
    if (!sub) return { active: false };
    if (new Date(sub.expireTime) <= new Date()) return { active: false };
    return { active: true, planId: sub.planId, expireTime: sub.expireTime };
  }

  // ==================== Usage Limits ====================

  async getUsageLimit(userId: string): Promise<UsageLimit | null> {
    const row = await this.db.prepare(
      'SELECT user_id, daily_free_count, used_count, reset_time FROM user_usage_limits WHERE user_id = ?'
    ).bind(userId).first<any>();
    return row ? { ...row, userId: row.user_id, dailyFreeCount: row.daily_free_count, usedCount: row.used_count, resetTime: row.reset_time } : null;
  }

  async ensureUsageLimit(userId: string, dailyFreeCount = 3): Promise<UsageLimit> {
    let limit = await this.getUsageLimit(userId);
    if (limit) {
      // Reset if past midnight
      if (new Date(limit.resetTime) <= new Date()) {
        await this.resetUsageLimit(userId, dailyFreeCount);
        limit = await this.getUsageLimit(userId)!;
      }
      return limit;
    }
    // Create
    const tomorrow = this.nextMidnight();
    await this.db.prepare(
      'INSERT INTO user_usage_limits (user_id, daily_free_count, used_count, reset_time) VALUES (?, ?, 0, ?)'
    ).bind(userId, dailyFreeCount, tomorrow.toISOString()).run();
    return { userId, dailyFreeCount, usedCount: 0, resetTime: tomorrow.toISOString() };
  }

  async consumeUsageLimit(userId: string): Promise<void> {
    await this.db.prepare('UPDATE user_usage_limits SET used_count = used_count + 1 WHERE user_id = ?').bind(userId).run();
  }

  async resetUsageLimit(userId: string, dailyFreeCount = 3): Promise<void> {
    const tomorrow = this.nextMidnight();
    await this.db.prepare('UPDATE user_usage_limits SET used_count = 0, daily_free_count = ?, reset_time = ? WHERE user_id = ?')
      .bind(dailyFreeCount, tomorrow.toISOString(), userId).run();
  }

  // ==================== Helpers ====================

  private nextMidnight(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  private mapWallet(row: any): Wallet {
    return {
      id: row.id, userId: row.user_id, credits: row.credits ?? 0, frozenCredits: row.frozen_credits ?? 0, totalUsed: row.total_used ?? 0,
      totalToppedUp: row.total_topped_up ?? 0, mode: (row.mode as 'balance'|'points'|'package') || 'balance',
      status: row.status || 'active', createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }

  private mapPricing(row: any): AIPricingRule {
    return {
      id: row.id, service: row.service, model: row.model,
      creditsPer100Tokens: row.credits_per_100_tokens,
      costUsdPer100Tokens: row.cost_usd_per_100_tokens,
      enabled: !!row.enabled, priority: row.priority ?? 0, createdAt: row.created_at,
    };
  }

  private mapQuotaRule(row: any): QuotaRule {
    return {
      id: row.id, name: row.name, description: row.description, scope: row.scope,
      scopeTarget: row.scope_target, ruleType: row.rule_type, limit: row.limit,
      periodStart: row.period_start, used: row.used, createdBy: row.created_by,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

  // --- Frozen Balance (Reservation) ---

  async addFrozenBalance(userId: string, amount: number): Promise<Wallet> {
    const now = new Date().toISOString();
    await this.db.prepare(
      'UPDATE wallets SET credits = credits - ?, frozen_credits = COALESCE(frozen_credits, 0) + ? WHERE user_id = ? AND credits >= ?'
    ).bind(amount, amount, userId, amount).run();
    const wallet = await this.getWallet(userId);
    if (!wallet) throw new Error('WALLET_NOT_FOUND_AFTER_FROZEN');
    return wallet;
  }

  async commitFromFrozen(userId: string, releaseAmount: number, actualCost: number): Promise<{ wallet: Wallet; excessReturn: number }> {
    // If actualCost > reserved, charge extra from regular balance
    // If actualCost < reserved, return excess
    const wallet = await this.getWallet(userId);
    if (!wallet) throw new Error('WALLET_NOT_FOUND');

    let excessReturn = 0;
    if (actualCost <= releaseAmount) {
      excessReturn = releaseAmount - actualCost;
      // Return excess to available credits
      await this.db.prepare('UPDATE wallets SET frozen_credits = COALESCE(frozen_credits, 0) - ?, credits = credits + ?, updated_at = ? WHERE user_id = ?')
        .bind(releaseAmount, excessReturn, new Date().toISOString(), userId).run();
    } else {
      const extra = actualCost - releaseAmount;
      // Charge extra from available balance
      await this.db.prepare('UPDATE wallets SET credits = credits - ?, frozen_credits = COALESCE(frozen_credits, 0) - ?, updated_at = ? WHERE user_id = ?')
        .bind(extra, releaseAmount, new Date().toISOString(), userId).run();
    }
    return { wallet: await this.getWallet(userId), excessReturn };
  }

  // --- Reservations ---

  async createReservation(res: Omit<BillingReservation, 'id' | 'reservedAt' | 'expiresAt'>): Promise<BillingReservation> {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h TTL
    const id = es__;
    await this.db.prepare(
      'INSERT INTO billing_reservations (id, user_id, task_id, amount, status, idempotency_key, reserved_at, expires_at) VALUES (?, ?, ?, ?, '\''pending'\'', ?, ?, ?)'
    ).bind(id, res.userId, res.taskId ?? null, res.amount, res.idempotencyKey, now, expiresAt).run();
    return { ...res, id, reservedAt: now, expiresAt } as BillingReservation;
  }

  async getReservationById(id: string): Promise<BillingReservation | null> {
    const row = await this.db.prepare('SELECT * FROM billing_reservations WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapReservation(row);
  }

  async getReservationByTaskId(taskId: string): Promise<BillingReservation | null> {
    const row = await this.db.prepare('SELECT * FROM billing_reservations WHERE task_id = ? AND status = '\''pending'\'' LIMIT 1').get(taskId);
    if (!row) return null;
    return this.mapReservation(row);
  }

  async getReservationByIdempotencyKey(key: string): Promise<BillingReservation | null> {
    const row = await this.db.prepare('SELECT * FROM billing_reservations WHERE idempotency_key = ? LIMIT 1').get(key);
    if (!row) return null;
    return this.mapReservation(row);
  }

  async updateReservationStatus(id: string, status: ReservationStatus): Promise<void> {
    await this.db.prepare('UPDATE billing_reservations SET status = ? WHERE id = ?').bind(status, id).run();
  }

  async expirePendingReservations(before: string): Promise<number> {
    const res = await this.db.prepare("UPDATE billing_reservations SET status = 'expired' WHERE status = 'pending' AND expires_at < ? RETURNING id, user_id, amount")
      .bind(before).run() as { changes?: number };
    // SQLite doesn't support RETURNING in UPDATE; need separate query
    const rows = await this.db.prepare("SELECT COUNT(*) as cnt FROM billing_reservations WHERE status = 'pending' AND expires_at < ?").bind(before).all();
    const cnt = Number((rows as any[])?.[0]?.cnt ?? 0);
    await this.db.prepare("UPDATE billing_reservations SET status = 'expired' WHERE status = 'pending' AND expires_at < ?").bind(before).run();
    return cnt;
  }

  async listUserReservations(userId: string, limit = 50): Promise<BillingReservation[]> {
    const rows = await this.db.prepare('SELECT * FROM billing_reservations WHERE user_id = ? ORDER BY reserved_at DESC LIMIT ?').bind(userId, limit).all();
    return ((rows as any[]) || []).map((r: any) => this.mapReservation(r));
  }

  private mapReservation(row: any): BillingReservation {
    return {
      id: row.id, userId: row.user_id, taskId: row.task_id ?? null,
      amount: row.amount, status: row.status as ReservationStatus,
      idempotencyKey: row.idempotency_key,
      reservedAt: row.reserved_at, expiresAt: row.expires_at,
    };
  }
