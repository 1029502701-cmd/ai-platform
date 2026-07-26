// Unified billing bridge - connects shared/billing/ to AI Core pipeline
import type { BillingRule } from './rules.ts';
import BillingService from './service.ts';
import { estimateCost } from './cost.ts';
import { loadBillingRules } from './rules.ts';

/**
 * Get effective cost for an AI request using the unified billing system.
 */
export async function getAICost(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  type?: 'text' | 'image' | 'agent';
  env?: any;
}): Promise<{ costCents: number; ruleKey?: string; metadata?: Record<string, any> }> {
  const { model, inputTokens, outputTokens, type = 'text', env } = params;
  
  let rules: BillingRule[] = [];
  if (env?.DB) {
    try { rules = await loadBillingRules(env); } catch {}
  }
  if (rules.length === 0 && !env?.DB) {
    rules = [
      { ruleKey: 'gpt4omini', serviceType: 'ai', target: 'openai-gpt-4o-mini', costPer1mInput: 150, costPer1mOutput: 600 },
      { ruleKey: 'gpt4o', serviceType: 'ai', target: 'openai-gpt-4o', costPer1mInput: 2500, costPer1mOutput: 10000 },
      { ruleKey: 'gemini', serviceType: 'ai', target: 'gemini-pro', costPer1mInput: 350, costPer1mOutput: 1050 },
      { ruleKey: 'deepseek', serviceType: 'ai', target: 'deepseek-chat', costPer1mInput: 140, costPer1mOutput: 280 },
      { ruleKey: 'image_gen', serviceType: 'ai', target: 'all', imageCostCents: 1500 },
      { ruleKey: 'agent_exec', serviceType: 'ai', target: 'all', agentCostCents: 500 },
    ];
  }

  const costCents = await estimateCost({ model, inputTokens, outputTokens, type, rules });
  const rule = rules.find(r => r.target === model || r.ruleKey === extractRuleKey(model));

  return { costCents, ruleKey: rule?.ruleKey, metadata: { type, model } };
}

export async function consumeForAI(params: {
  env: any;
  userId: number;
  amountCents: number;
  reason: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; consumedCents: number; balanceBefore: number; balanceAfter: number; error?: string }> {
  return BillingService.consume(params.env, {
    userId: params.userId,
    amountCents: params.amountCents,
    reason: params.reason,
    metadata: params.metadata,
  });
}

export async function grantQuota(params: {
  env: any;
  userId: number;
  amountCents: number;
  reason: string;
}): Promise<{ success: boolean; granted: number }> {
  await BillingService.grantQuota(params.env, {
    userId: params.userId,
    amountCents: params.amountCents,
    reason: params.reason,
  });
  return { success: true, granted: params.amountCents };
}

export async function checkUserQuota(env: any, userId: number): Promise<{
  hasBalance: boolean;
  balanceCents: number;
  dailyLimit: number;
  dailyUsed: number;
}> {
  return BillingService.checkQuota(env, userId);
}

export async function reserveCredits(params: {
  env: any;
  userId: number;
  amountCents: number;
}): Promise<{ success: boolean; reserved: number; error?: string }> {
  const db = params.env?.DB;
  if (!db?.prepare) return { success: false, reserved: 0, error: 'DB_NOT_AVAILABLE' };
  
  try {
    const wallet: any = await db.prepare('SELECT credits FROM wallets WHERE user_id = ?').bind(params.userId).first();
    if (!wallet) return { success: false, reserved: 0, error: 'NO_WALLET' };
    if (wallet.credits < params.amountCents) return { success: false, reserved: 0, error: 'INSUFFICIENT' };
    
    await db.prepare(
      "UPDATE wallets SET credits = credits - ?, frozen = COALESCE(frozen, 0) + ? WHERE user_id = ?"
    ).run(params.amountCents, params.amountCents, params.userId);
    
    return { success: true, reserved: params.amountCents };
  } catch (e) {
    return { success: false, reserved: 0, error: String(e) };
  }
}

export async function commitReservation(params: {
  env: any;
  userId: number;
  amountCents: number;
  transactionReason: string;
}): Promise<boolean> {
  const db = params.env?.DB;
  if (!db?.prepare) return false;
  
  try {
    await db.prepare(
      "INSERT INTO billing_transactions (user_id, tx_type, amount_cents, reason) VALUES (?, 'consume', ?, ?)"
    ).bind(params.userId, params.amountCents, params.transactionReason).run();
    return true;
  } catch {
    return false;
  }
}

export async function refundReservation(params: {
  env: any;
  userId: number;
  amountCents: number;
  reason: string;
}): Promise<boolean> {
  const db = params.env?.DB;
  if (!db?.prepare) return false;
  
  try {
    await db.prepare(
      "UPDATE wallets SET credits = credits + ?, frozen = MAX(0, COALESCE(frozen, 0) - ?) WHERE user_id = ?"
    ).run(params.amountCents, params.amountCents, params.userId);
    
    await db.prepare(
      "INSERT INTO billing_transactions (user_id, tx_type, amount_cents, reason) VALUES (?, 'refund', ?, ?)"
    ).bind(params.userId, params.amountCents, params.reason).run();
    
    return true;
  } catch {
    return false;
  }
}

function extractRuleKey(model: string): string {
  if (model.includes('4o-mini')) return 'gpt4omini';
  if (model.includes('4o')) return 'gpt4o';
  if (model.includes('gemini')) return 'gemini';
  if (model.includes('claude')) return 'claudeopus';
  if (model.includes('deepseek')) return 'deepseek';
  return '';
}