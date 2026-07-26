import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED", message: "Admin access required" }, 403);

    const db = (context.env as any).DB;
    if (!db) return jsonResponse({ code: "NO_DB", message: "Database not configured" }, 500);

    const now = new Date().toISOString().slice(0, 10);

    try {
        // System health check
        const userCount: any = await db.prepare("SELECT COUNT(*) as cnt FROM users").first();
        const taskCount: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_tasks").first();
        const activeTaskCount: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_tasks WHERE status IN ('pending','queued','running')").first();

        // Today's AI calls (from ai_usage table)
        const todayUsage: any = await db.prepare(
            "SELECT COUNT(*) as calls, COALESCE(SUM(tokens_total),0) as tokens, COALESCE(SUM(cost_usd),0) as cost FROM ai_usage WHERE date(created_at) = ?"
        ).bind(now).first();

        // Today's transactions
        const todayTx: any = await db.prepare(
            "SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM transactions WHERE date(created_at) = ?"
        ).bind(now).first();

        // Failed tasks in last 24h
        const failedToday: any = await db.prepare(
            "SELECT COUNT(*) as cnt FROM ai_tasks WHERE status = 'failed' AND created_at >= datetime('now', '-1 day')"
        ).first();

        // Queue depth
        const pending: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_tasks WHERE status = 'pending' OR status = 'queued'").first();
        const running: any = await db.DB ? await db.prepare("SELECT COUNT(*) as cnt FROM ai_tasks WHERE status = 'running'").first() : null;

        // Avg response time (derived from duration_ms in ai_usage)
        const avgDuration: any = await db.prepare(
            "SELECT AVG(duration_ms) as avg_ms FROM ai_usage WHERE duration_ms > 0 LIMIT 1000"
        ).first();

        // DB health
        let dbHealth = "healthy";
        try { await db.prepare("SELECT 1").all(); } catch { dbHealth = "unhealthy"; }

        const stats = {
            system_health: dbHealth,
            users: { total: userCount?.cnt ?? 0, active: userCount?.cnt ?? 0 },
            tasks: { total: taskCount?.cnt ?? 0, active: activeTaskCount?.cnt ?? 0, pending: pending?.cnt ?? 0, running: running?.cnt ?? 0, failed_today: failedToday?.cnt ?? 0 },
            ai_calls: { today: todayUsage?.calls ?? 0, tokens: todayUsage?.tokens ?? 0, cost: todayUsage?.cost ?? 0 },
            transactions: { today_count: todayTx?.count ?? 0, today_total: todayTx?.total ?? 0 },
            avg_response_ms: avgDuration?.avg_ms ?? 0,
        };

        return jsonResponse(stats, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown error" }, 500);
    }
};