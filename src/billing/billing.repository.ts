import type { Wallet, AIUsage, AIPricing } from './billing.types';

// Repository: only DB access. This file uses a generic `db` argument so it can be wired to D1 or other DB by caller.

export class BillingRepository {
  db: any;
  constructor(db: any) {
    this.db = db;
  }

  async getWallet(userId: string): Promise<Wallet | null> {
    // Implementation depends on D1 client. Caller provides db.
    const row = await this.db.prepare("SELECT * FROM wallet WHERE user_id = ?").bind(userId).first();
    return row ?? null;
  }

  async createWallet(userId: string): Promise<Wallet> {
    const id = `w_${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    await this.db.prepare("INSERT INTO wallet (id, user_id, credits, total_used, created_at, updated_at) VALUES (?,?,?,?,?,?)").bind(id, userId, 0, 0, now, now).run();
    return { id, user_id: userId, credits: 0, total_used: 0, created_at: now, updated_at: now };
  }

  async updateCredits(userId: string, deltaCredits: number): Promise<Wallet> {
    const now = new Date().toISOString();
    // optimistic update: update credits and total_used if negative delta indicates consumption
    await this.db.prepare("UPDATE wallet SET credits = credits + ?, total_used = total_used + ? WHERE user_id = ?").bind(deltaCredits, Math.max(0, -deltaCredits), userId).run();
    const row = await this.getWallet(userId);
    if (!row) throw new Error('wallet_not_found');
    // update timestamp
    await this.db.prepare("UPDATE wallet SET updated_at = ? WHERE id = ?").bind(now, row.id).run();
    row.updated_at = now;
    return row;
  }

  async createUsageRecord(u: Omit<AIUsage, 'id' | 'created_at'> & { id?: string }): Promise<AIUsage> {
    const id = u.id ?? `usage_${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    await this.db.prepare("INSERT INTO ai_usage (id, user_id, service, model, input_tokens, output_tokens, credits_used, cost_usd, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id, u.user_id, u.service, u.model, u.input_tokens, u.output_tokens, u.credits_used, u.cost_usd, u.status, now).run();
    return { id, created_at: now, ...u } as AIUsage;
  }

  async getPricing(service: string, model: string): Promise<AIPricing | null> {
    const row = await this.db.prepare("SELECT * FROM ai_pricing WHERE service = ? AND model = ? AND enabled = 1 ORDER BY created_at DESC LIMIT 1").bind(service, model).first();
    return row ?? null;
  }
}
