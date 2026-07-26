import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED", message: "Admin access required" }, 403);

    const url = new URL(context.request.url);
    const status = url.searchParams.get("status") || "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const db = (context.env as any).DB;
    if (!db) return jsonResponse({ code: "NO_DB", message: "Database not configured" }, 500);

    try {
        let query = "SELECT t.*, u.nickname as user_nickname FROM ai_tasks t LEFT JOIN users u ON t.created_by = u.id WHERE 1=1";
        const params: any[] = [];

        if (status) {
            query += " AND t.status = ?";
            params.push(status);
        }

        query += " ORDER BY t.created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const rows: any[] = await db.prepare(query).bind(...params).all();

        // Status breakdown
        const breakdown: any = await db.prepare(
            "SELECT status, COUNT(*) as cnt FROM ai_tasks WHERE created_at >= datetime('now', '-7 days') GROUP BY status"
        ).all();

        // Queue depth summary
        const depth: any = await db.prepare(
            "SELECT COUNT(*) as cnt FROM ai_tasks WHERE status IN ('pending','queued','running')"
        ).first();

        return jsonResponse({
            tasks: (rows || []).map((r: any) => ({
                id: r.id,
                userId: r.created_by,
                userNickname: r.user_nickname,
                scenario: r.scenario,
                model: r.model_name,
                status: r.status,
                priority: r.priority,
                retryCount: r.retry_count,
                duration_ms: r.duration_ms,
                createdAt: r.created_at,
            })),
            queueDepth: depth?.cnt ?? 0,
            statusBreakdown: (breakdown || []).map((b: any) => ({ status: b.status, count: b.cnt })),
        }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};