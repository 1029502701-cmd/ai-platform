import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

const handler = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED", message: "Admin access required" }, 403);
    const env = context.env as any;

    const db = env.DB;
    const result: any = {};
    try {
        const totalUsers: any = await db.prepare("SELECT COUNT(*) as cnt FROM users").first();
        const activeUsers: any = await db.prepare("SELECT COUNT(*) as cnt FROM users WHERE status='active'").first();
        const guestUsers: any = await db.prepare("SELECT COUNT(*) as cnt FROM users WHERE type='guest' AND status='active'").first();
        const vipUsers: any = await db.prepare("SELECT COUNT(*) as cnt FROM users WHERE type='wechat' AND status='active'").first();
        const todayNew: any = await db.prepare("SELECT COUNT(*) as cnt FROM users WHERE date(created_at)=date('now')").first();
        const aiToday: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_usage WHERE date(created_at)=date('now')").first();
        const aiTotal: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_usage").first();
        const aiFailedToday: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_tasks WHERE status='failed' AND date(created_at)=date('now')").first();
        const tokenStats: any = await db.prepare("SELECT COALESCE(SUM(tokens_total),0) as tokens,COALESCE(SUM(cost_usd),0) as cost FROM ai_usage WHERE date(created_at)=date('now')").first();
        const revToday: any = await db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE date(created_at)=date('now')").first();
        const pendingQ: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_tasks WHERE status IN ('pending','queued')").first();
        const runningQ: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_tasks WHERE status='running'").first();

        result.summary = {
            total_users: totalUsers?.cnt ?? 0,
            active_users: activeUsers?.cnt ?? 0,
            guest_users: guestUsers?.cnt ?? 0,
            vip_users: vipUsers?.cnt ?? 0,
            today_new_users: todayNew?.cnt ?? 0,
            ai_calls_today: aiToday?.cnt ?? 0,
            ai_calls_total: aiTotal?.cnt ?? 0,
            ai_failed_today: aiFailedToday?.cnt ?? 0,
            tokens_today: tokenStats?.tokens ?? 0,
            cost_today: tokenStats?.cost ?? 0,
            revenue_today: revToday?.total ?? 0,
            queue_pending: pendingQ?.cnt ?? 0,
            queue_running: runningQ?.cnt ?? 0,
        };
    } catch (e) {
        result.error = e instanceof Error ? e.message : "query failed";
    }
    return jsonResponse(result, 200);
};

export const onRequestGet = handler;
export const onRequestPost = handler;
export const onRequestPatch = handler;
