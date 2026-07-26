import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse, requireUserAuth } from "../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireUserAuth(context);
    if (!auth) return jsonResponse({ code: "UNAUTHENTICATED", message: "Login required" }, 401);
    const env = context.env as any;
    const db = env.DB;
    const userId = auth.user.id;

    try {
        const rows: any[] = await db.prepare(
            "SELECT action, model, tokens_in, tokens_out, cost_cents, status, duration_ms, created_at FROM user_usage WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
        ).bind(userId).all();

        // Summary stats
        const summary: any = await db.prepare(
            "SELECT COUNT(*) as total_calls, SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as errors, COALESCE(SUM(duration_ms),0) as total_ms FROM user_usage WHERE user_id = ?"
        ).bind(userId).first();

        return jsonResponse({
            records: rows || [],
            summary: { totalCalls: summary?.total_calls ?? 0, success: summary?.success ?? 0, errors: summary?.errors ?? 0, avgMs: summary?.total_calls ? Math.round((summary.total_ms || 0) / summary.total_calls) : 0 },
        }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
