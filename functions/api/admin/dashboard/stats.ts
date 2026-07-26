import type { PagesFunction } from '@cloudflare/workers-types';
import { requireAdminAuth, jsonResponse } from '../../../_auth.ts';

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);

  // Context destructured below
  const env = context.env as any;
  const db = env.DB;

  // User counts by type
  const usersByType: any[] = await db.prepare("SELECT type, COUNT(*) as cnt FROM users WHERE status = 'active' GROUP BY type").all();
  const userMap = Object.fromEntries((usersByType || []).map((r: any) => [r.type, r.cnt]));
  const totalUsers = (Object.values(userMap) as number[]).reduce((s: number, n: number) => s + n, 0);

  // VIP count (wechat + non-guest)
  const vipRes: any = await db.prepare("SELECT COUNT(*) as cnt FROM users WHERE type = 'wechat' AND status = 'active'").first();
  const vipCount = vipRes?.cnt ?? 0;

  // AI usage stats
  const aiCalls: any = await db.prepare('SELECT COUNT(*) as cnt FROM ai_usage').first();
  const todayCalls: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_usage WHERE created_at >= date('now', '-1 day')").first();
  const failedTasks: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_tasks WHERE status = 'failed'").first();

  // Total credits consumed & revenue
  const creditsData: any = await db.prepare('SELECT COALESCE(SUM(credits_used), 0) as total_credits, COALESCE(SUM(cost_usd), 0) as total_cost FROM ai_usage').first();
  const revenueData: any = await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'topup' OR type = 'subscription_grant'").first();

  const stats = {
    total_users: totalUsers,
    guest_count: userMap['guest'] ?? 0,
    wechat_count: userMap['wechat'] ?? 0,
    vip_count: Number(vipCount),
    today_ai_calls: Number(todayCalls?.cnt ?? 0),
    total_ai_calls: Number(aiCalls?.cnt ?? 0),
    total_credits_used: Number(creditsData?.total_credits ?? 0),
    failed_tasks: Number(failedTasks?.cnt ?? 0),
    total_revenue: Number(revenueData?.total ?? 0),
  };

  return jsonResponse(stats, 200);
};
