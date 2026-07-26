import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED", message: "Admin access required" }, 403);

    const url = new URL(context.request.url);
    const days = parseInt(url.searchParams.get("days") || "7");
    const provider = url.searchParams.get("provider") || "";

    const db = (context.env as any).DB;
    if (!db) return jsonResponse({ code: "NO_DB", message: "Database not configured" }, 500);

    try {
        // Provider summary for last N days
        const summary: any[] = await db.prepare(
            `SELECT provider, model, status, COUNT(*) as calls, COALESCE(SUM(duration_ms),0) as total_ms, COALESCE(SUM(cost_usd),0) as total_cost,
                    ROUND(AVG(duration_ms), 0) as avg_ms
             FROM ai_usage
             WHERE created_at >= datetime('now', '-' || ? || ' days')
             ` + (provider ? " AND provider = ?" : "") + `
             GROUP BY provider, model, status
             ORDER BY calls DESC`
        ).bind(days, ...(provider ? [provider] : [])).all();

        // Error rate
        const totalCalls: any = await db.prepare(
            "SELECT COUNT(*) as total, SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as errors FROM ai_usage WHERE created_at >= datetime('now', '-' || ? || ' days')"
        ).bind(days).first();

        return jsonResponse({
            summary: (summary || []).map((r: any) => ({
                provider: r.provider,
                model: r.model,
                status: r.status,
                calls: r.calls,
                totalMs: r.total_ms,
                avgMs: r.avg_ms,
                totalCost: r.total_cost,
            })),
            errorRate: {
                totalCalls: totalCalls?.total ?? 0,
                errors: totalCalls?.errors ?? 0,
                rate: totalCalls?.total ? ((totalCalls.errors ?? 0) / totalCalls.total * 100).toFixed(2) : "0",
            },
        }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};