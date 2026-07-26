import { getLogger } from "../logger";
import type { BillingOrder, BillingTransaction, ConsumeResult } from "./types.ts";
import type { BillingRule } from "./rules.ts";

const log = getLogger("billing_service");

class BillingService {
  static genOrderNo(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return "ORD-" + ts + "-" + rand;
  }

  static async createOrder(env: any, params: { userId: number; productId?: number; amountCents: number; productCode?: string }): Promise<BillingOrder | null> {
    const db = env?.DB;
    if (!db?.prepare) { log.error("DB_NOT_AVAILABLE"); return null; }

    const orderNo = this.genOrderNo();
    const res: any = await db.prepare(
      "INSERT INTO billing_orders (order_no, user_id, product_id, amount_cents, currency, status, payment_provider) VALUES (?, ?, ?, ?, 'CNY', 'pending', NULL)"
    ).run(orderNo, params.userId, params.productId || null, params.amountCents);

    const order: BillingOrder = {
      id: res.lastInsertRowid as number,
      orderNo, userId: params.userId, productId: params.productId || undefined,
      amountCents: params.amountCents, currency: "CNY", status: "pending", createdAt: new Date().toISOString(),
    };
    log.info("Order created", { orderNo, userId: params.userId, amountCents: params.amountCents });
    return order;
  }

  static async confirmPayment(env: any, orderId: number): Promise<boolean> {
    const db = env?.DB;
    if (!db?.prepare) return false;

    const row: any = await db.prepare("SELECT id, user_id, amount_cents, product_id FROM billing_orders WHERE id = ? AND status = 'pending'").bind(orderId).first();
    if (!row) return false;

    try {
      await db.transaction(async (tx: any) => {
        await tx.prepare("UPDATE billing_orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(orderId);

        const balanceBefore = 0;
        const balanceAfter = balanceBefore;
        await tx.prepare(
          "INSERT INTO billing_transactions (user_id, order_id, tx_type, amount_cents, balance_before, balance_after, reason) VALUES (?, ?, 'purchase', ?, ?, ?, 'order_paid')"
        ).run(row.user_id, orderId, row.amount_cents, balanceBefore, balanceAfter);
      });
      log.info("Payment confirmed", { orderId });
      return true;
    } catch (e) {
      log.error("Payment confirmation failed", { orderId, error: String(e) });
      return false;
    }
  }

  static async consume(env: any, params: { userId: number; amountCents: number; reason: string; metadata?: Record<string, any> }): Promise<ConsumeResult> {
    const db = env?.DB;
    if (!db?.prepare) return { success: false, consumedCents: 0, balanceBefore: 0, balanceAfter: 0, error: "DB_NOT_AVAILABLE" };

    try {
      return await db.transaction(async (tx: any) => {
        const wallet: any = await tx.prepare("SELECT id, credits, total_used FROM wallets WHERE user_id = ?").bind(params.userId).first();
        if (!wallet) return { success: false, consumedCents: 0, balanceBefore: 0, balanceAfter: 0, error: "NO_WALLET" };

        const balanceBefore = wallet.credits;
        if (balanceBefore < params.amountCents) {
          return { success: false, consumedCents: 0, balanceBefore, balanceAfter: 0, error: "INSUFFICIENT_BALANCE" };
        }

        const balanceAfter = balanceBefore - params.amountCents;
        await tx.prepare("UPDATE wallets SET credits = ?, total_used = total_used + ? WHERE user_id = ?").bind(balanceAfter, params.amountCents, params.userId).run();

        await tx.prepare(
          "INSERT INTO billing_transactions (user_id, tx_type, amount_cents, balance_before, balance_after, reason, metadata) VALUES (?, 'consume', ?, ?, ?, ?, ?)"
        ).bind(params.userId, params.amountCents, balanceBefore, balanceAfter, params.reason, params.metadata ? JSON.stringify(params.metadata) : null).run();

        log.info("Credits consumed", { userId: params.userId, amountCents: params.amountCents, balanceAfter });
        return { success: true, consumedCents: params.amountCents, balanceBefore, balanceAfter };
      });
    } catch (e) {
      return { success: false, consumedCents: 0, balanceBefore: 0, balanceAfter: 0, error: String(e) };
    }
  }

  static async refund(env: any, params: { userId: number; amountCents: number; reason?: string }): Promise<ConsumeResult> {
    const db = env?.DB;
    if (!db?.prepare) return { success: false, consumedCents: 0, balanceBefore: 0, balanceAfter: 0, error: "DB_NOT_AVAILABLE" };

    try {
      return await db.transaction(async (tx: any) => {
        const wallet: any = await tx.prepare("SELECT id, credits FROM wallets WHERE user_id = ?").bind(params.userId).first();
        if (!wallet) return { success: false, consumedCents: 0, balanceBefore: 0, balanceAfter: 0, error: "NO_WALLET" };

        const balanceBefore = wallet.credits;
        const balanceAfter = balanceBefore + params.amountCents;
        await tx.prepare("UPDATE wallets SET credits = ?, total_used = total_used - ? WHERE user_id = ?").bind(balanceAfter, params.amountCents, params.userId).run();

        await tx.prepare(
          "INSERT INTO billing_transactions (user_id, tx_type, amount_cents, balance_before, balance_after, reason) VALUES (?, 'refund', ?, ?, ?, ?)"
        ).bind(params.userId, params.amountCents, balanceBefore, balanceAfter, params.reason || "refund").run();

        log.info("Credits refunded", { userId: params.userId, amountCents: params.amountCents, balanceAfter });
        return { success: true, consumedCents: -params.amountCents, balanceBefore, balanceAfter };
      });
    } catch (e) {
      return { success: false, consumedCents: 0, balanceBefore: 0, balanceAfter: 0, error: String(e) };
    }
  }

  static async grantQuota(env: any, params: { userId: number; amountCents: number; reason: string }): Promise<ConsumeResult> {
    const db = env?.DB;
    if (!db?.prepare) return { success: false, consumedCents: 0, balanceBefore: 0, balanceAfter: 0, error: "DB_NOT_AVAILABLE" };

    try {
      return await db.transaction(async (tx: any) => {
        let wallet: any = await tx.prepare("SELECT id, credits FROM wallets WHERE user_id = ?").bind(params.userId).first();
        if (!wallet) {
          await tx.prepare(
            "INSERT INTO wallets (user_id, credits, total_used, mode, status, created_at, updated_at) VALUES (?, 0, 0, 'credits', 'active', datetime('now'), datetime('now'))"
          ).run(params.userId);
          return { success: false, consumedCents: 0, balanceBefore: 0, balanceAfter: 0, error: "WALLET_CREATED_RETRY" };
        }

        const balanceBefore = wallet.credits;
        const balanceAfter = balanceBefore + params.amountCents;
        await tx.prepare("UPDATE wallets SET credits = ? WHERE user_id = ?").bind(balanceAfter, params.userId).run();

        await tx.prepare(
          "INSERT INTO billing_transactions (user_id, tx_type, amount_cents, balance_before, balance_after, reason) VALUES (?, 'grant', ?, ?, ?, ?)"
        ).bind(params.userId, params.amountCents, balanceBefore, balanceAfter, params.reason).run();

        return { success: true, consumedCents: -params.amountCents, balanceBefore, balanceAfter };
      });
    } catch (e) {
      return { success: false, consumedCents: 0, balanceBefore: 0, balanceAfter: 0, error: String(e) };
    }
  }

  static async checkQuota(env: any, userId: number): Promise<{ hasBalance: boolean; balanceCents: number; dailyLimit: number; dailyUsed: number }> {
    const db = env?.DB;
    if (!db?.prepare) return { hasBalance: true, balanceCents: 999999999, dailyLimit: 1000, dailyUsed: 0 };

    try {
      const wallet: any = await db.prepare("SELECT credits FROM wallets WHERE user_id = ?").bind(userId).first();
      const balance = wallet?.credits ?? 0;

      const today = new Date().toISOString().slice(0, 10);
      const dayUsage: any = await db.prepare(
        "SELECT COALESCE(SUM(amount_cents), 0) as total FROM billing_transactions WHERE user_id = ? AND tx_type = 'consume' AND date(created_at) = ?"
      ).bind(userId, today).first();

      return {
        hasBalance: balance > 0,
        balanceCents: balance,
        dailyLimit: 1000,
        dailyUsed: dayUsage.total ?? 0,
      };
    } catch {
      return { hasBalance: true, balanceCents: 999999999, dailyLimit: 1000, dailyUsed: 0 };
    }
  }

  static async createTransaction(env: any, params: Omit<BillingTransaction, "id" | "createdAt">): Promise<number | null> {
    const db = env?.DB;
    if (!db?.prepare) return null;
    const res: any = await db.prepare(
      "INSERT INTO billing_transactions (user_id, order_id, subscription_id, tx_type, amount_cents, balance_before, balance_after, reason, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(params.userId, params.orderId || null, params.subscriptionId || null, params.txType, params.amountCents, params.balanceBefore ?? 0, params.balanceAfter ?? 0, params.reason || null, params.metadata ? JSON.stringify(params.metadata) : null);
    return res.lastInsertRowid as number;
  }

  static estimateCostFromRules(ruleKey: string, inputTokens: number, _outputTokens: number, ruleList: BillingRule[]): number {
    const rule = ruleList.find(r => r.ruleKey === ruleKey);
    if (!rule) return 0;
    const costPerInput = rule.costPer1mInput || rule.creditsPer1mInput || 0;
    const costPerOutput = rule.costPer1mOutput || rule.creditsPer1mOutput || 0;
    return Math.round((inputTokens / 1_000_000) * (costPerInput + costPerOutput));
  }

  static async getUserBillingInfo(env: any, userId: number): Promise<any> {
    const db = env?.DB;
    if (!db?.prepare) return {};
    try {
      const wallet: any = await db.prepare("SELECT credits, total_used, mode, status FROM wallets WHERE user_id = ?").bind(userId).first();
      const recentTx: any[] = (await db.prepare("SELECT * FROM billing_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").bind(userId).all()) || [];
      const subs: any[] = (await db.prepare(
        "SELECT us.*, bp.name as plan_name, bp.code as plan_code, bp.product_type FROM user_subscriptions us JOIN billing_products bp ON bp.id = us.product_id WHERE us.user_id = ? AND us.status = 'active'"
      ).bind(userId).all()) || [];
      return { wallet, transactions: recentTx, subscriptions: subs };
    } catch { return {}; }
  }
}

export default BillingService;
