import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED", message: "Admin access required" }, 403);

    const url = new URL(context.request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const level = url.searchParams.get("level") || "";
    const module = url.searchParams.get("module") || "";
    const requestId = url.searchParams.get("requestId") || "";

    const db = (context.env as any).DB;
    if (!db) return jsonResponse({ code: "NO_DB", message: "Database not configured" }, 500);

    try {
        let query = "SELECT * FROM system_logs WHERE 1=1";
        const params: any[] = [];

        if (level) {
            query += " AND level = ?";
            params.push(level);
        }
        if (module) {
            query += " AND module = ?";
            params.push(module);
        }
        if (requestId) {
            query += " AND request_id = ?";
            params.push(requestId);
        }

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const rows: any[] = await db.prepare(query).bind(...params).all();

        // Count total
        let countQuery = "SELECT COUNT(*) as cnt FROM system_logs WHERE 1=1";
        const countParams: any[] = [];
        if (level) { countQuery += " AND level = ?"; countParams.push(level); }
        if (module) { countQuery += " AND module = ?"; countParams.push(module); }
        if (requestId) { countQuery += " AND request_id = ?"; countParams.push(requestId); }
        const total: any = await db.prepare(countQuery).bind(...countParams).first();

        return jsonResponse({
            logs: (rows || []).map((r: any) => ({
                id: r.id,
                requestId: r.request_id,
                level: r.level,
                module: r.module,
                message: r.message,
                metadata: r.metadata ? JSON.parse(r.metadata) : {},
                createdAt: r.created_at,
            })),
            pagination: { total: total?.cnt ?? 0, limit, offset },
        }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};