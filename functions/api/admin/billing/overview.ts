import type { PagesFunction } from '@cloudflare/workers-types';
import { requireAdminAuth, jsonResponse } from '../../../_auth.ts';

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);

  const db = (context.env as any).DB;

  // Today's credit consumption
  const todayCredits: any = await db.prepare("SELECT COALESCE(SUM(credits_used), 0) as total FROM ai_usage WHERE created_at >= date('now', '-1 day')").first();
  // Total revenue from topups/subscriptions
  const revenue: any = await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type IN ('topup', 'subscription_grant')").first();
  // Total cost in USD
  const costUsd: any = await db.prepare("SELECT COALESCE(SUM(cost_usd), 0) as total FROM ai_usage").first();
  // Transaction count
  const txCount: any = await db.prepare("SELECT COUNT(*) as cnt FROM transactions WHERE status = 'completed'").first();
  // Wallet totals
  const wallets: any = await db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(credits), 0) as total_credits FROM wallets").first();

  return jsonResponse({
    today_credits: Number(todayCredits?.total ?? 0),
    total_revenue: Number(revenue?.total ?? 0),
    total_cost_usd: Number(costUsd?.total ?? 0),
    total_transactions: Number(txCount?.cnt ?? 0),
    wallet_count: Number(wallets?.cnt ?? 0),
    total_wallet_credits: Number(wallets?.total_credits ?? 0),
  }, 200);
};