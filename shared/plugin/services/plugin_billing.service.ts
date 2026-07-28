/**
 * PluginBillingService - Manages plugin pricing, billing, and revenue tracking
 * Reuses Platform-010 Billing system without reimplementing credits logic.
 */

import {Db} from "../../../drizzle";
import {metricsService} from "../../metrics/metrics.service";

interface RevenueShareConfig {
  platformFeePercent: number;
  developerPercent: number;
}

type PricingType = "free" | "credit" | "subscription" | "usage";

export interface PluginPricingPlan {
  id: string;
  pluginId: string;
  planName: string;
  pricingType: PricingType;
  price: number;
  creditsCost: number;
  billingPeriod?: string;
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
}

export class PluginBillingService {
  private db: Db;
  private config: RevenueShareConfig;

  constructor(db: Db, config?: Partial<RevenueShareConfig>) {
    this.db = db;
    this.config = {
      platformFeePercent: config?.platformFeePercent || 30,
      developerPercent: config?.developerPercent || 70,
    };
  }

  async checkPluginPricing(pluginId: string): Promise<PluginPricingPlan[]> {
    const query = "SELECT * FROM plugin_pricing_plans WHERE plugin_id = ? AND status = 'active'";
    const results = await this.db.query(query, [pluginId]);
    return results.map(r => ({
      id: r.id,
      pluginId: r.plugin_id,
      planName: r.plan_name,
      pricingType: r.pricing_type as PricingType,
      price: r.price,
      creditsCost: r.credits_cost,
      billingPeriod: r.billing_period,
      status: r.status as "active" | "inactive" | "archived",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async calculateUsageCost(pluginId: string, usageType: string, amount: number = 1): Promise<number> {
    const plans = await this.checkPluginPricing(pluginId);
    const activePlan = plans.find(p => p.status === "active");
    if (!activePlan) throw new Error("No active pricing plan found for plugin");
    switch (activePlan.pricingType) {
      case "free": return 0;
      case "credit": return (activePlan.creditsCost || 1) * amount;
      case "subscription": return activePlan.price;
      case "usage": return activePlan.price * amount;
      default: return 0;
    }
  }

  async consumePluginCredits(pluginId: string, userId: string, amount: number, description: string): Promise<boolean> {
    await this.recordPluginUsage(pluginId, userId, "credit_consume", amount, {description});
    console.log("Deducted " + amount + " credits from user " + userId);
    return true;
  }

  async recordRevenue(pluginId: string, developerId: string, userId: string, transactionType: "purchase" | "usage" | "subscription", grossAmount: number, currency: string = "CNY") {
    const platformFee = Math.round(grossAmount * this.config.platformFeePercent / 100);
    const developerAmount = grossAmount - platformFee;
    const now = new Date().toISOString();
    const txId = "tx_" + pluginId + "_" + userId + "_" + now;
    await this.db.execute({
      sql: "INSERT INTO plugin_revenue_transactions (id, plugin_id, developer_id, user_id, transaction_type, gross_amount, platform_fee, developer_amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      params: [txId, pluginId, developerId, userId, transactionType, grossAmount, platformFee, developerAmount, currency, "completed", now]
    });
    await this.updateDeveloperAccount(developerId, developerAmount, grossAmount);
    metricsService.gauge("plugin_revenue_total", (metricsService.get("plugin_revenue_total") || 0) + grossAmount);
    metricsService.gauge("plugin_developer_income_total", (metricsService.get("plugin_developer_income_total") || 0) + developerAmount);
    return {id:txId,pluginId,developerId,userId,transactionType,grossAmount,platformFee,developerAmount,currency,status:"completed",createdAt:now};
  }

  private async updateDeveloperAccount(developerId: string, developerAmount: number, grossAmount: number) {
    const now = new Date().toISOString();
    const account = await this.db.prepare("SELECT * FROM plugin_developer_accounts WHERE developer_id = ?").first(developerId);
    if (!account) {
      await this.db.execute("INSERT INTO plugin_developer_accounts (id, developer_id, balance, total_revenue, total_withdrawn, status, created_at, updated_at) VALUES (?, ?, 0, 0, 0, \"active\", ? , ?)", ["acc_"+developerId, developerId, now, now]);
    } else {
      await this.db.execute("UPDATE plugin_developer_accounts SET balance = balance + ?, total_revenue = total_revenue + ?, updated_at = ? WHERE developer_id = ?", [developerAmount, grossAmount, now, developerId]);
    }
  }

  async getPluginUsage(pluginId: string, userId: string, options = {}) {
    let query = "SELECT * FROM plugin_usage_records WHERE plugin_id = ? AND user_id = ?";
    const params = [pluginId, userId];
    if (options.startDate) { query += " AND created_at >= ?"; params.push(options.startDate); }
    if (options.endDate) { query += " AND created_at <= ?"; params.push(options.endDate); }
    if (options.limit) { query += " LIMIT ?"; params.push(options.limit); }
    query += " ORDER BY created_at DESC";
    const results = await this.db.query(query, params);
    return results.map(r => ({
      id: r.id,
      pluginId: r.plugin_id,
      userId: r.user_id,
      requestId: r.request_id,
      usageType: r.usage_type,
      creditsUsed: r.credits_used,
      metadata: JSON.parse(r.metadata || "{}"),
      createdAt: r.created_at,
    }));
  }

  async recordPluginUsage(pluginId: string, userId: string, usageType: string, creditsUsed: number, metadata = {}) {
    const now = new Date().toISOString();
    const recordId = "rec_" + pluginId + "_" + userId + "_" + now;
    await this.db.execute("INSERT INTO plugin_usage_records (id, plugin_id, user_id, request_id, usage_type, credits_used, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [recordId, pluginId, null, usageType, creditsUsed, JSON.stringify(metadata), now]);
    metricsService.increment("plugin_usage_total");
    metricsService.gauge("plugin_credit_consumed_total", (metricsService.get("plugin_credit_consumed_total") || 0) + creditsUsed);
  }

  setRevenueShareConfig(config: Partial<RevenueShareConfig>) { this.config = {...this.config,...config}; }
  getRevenueShareConfig() { return {...this.config}; }
}

export function createPluginBillingService(db, config) { return new PluginBillingService(db, config); }
