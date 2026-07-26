import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    const url = new URL(context.request.url);
    const status = url.searchParams.get("status") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = (page - 1) * limit;
    try {
        let where = status ? "WHERE status = ?" : "";
        const params: any[] = status ? [status] : [];
        const rows: any[] = await db.prepare(
            `SELECT t.*, u.nickname FROM ai_tasks t LEFT JOIN users u ON t.created_by = u.id ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`
        ).bind(...params, limit, offset).all();
        const total: any = await db.prepare(`SELECT COUNT(*) as cnt FROM ai_tasks ${where}`).bind(...params).first();
        // Status breakdown
        const breakdown: any[] = await db.prepare("SELECT status, COUNT(*) as cnt FROM ai_tasks GROUP BY status").all();
        return jsonResponse({ tasks: rows || [], pagination: { total: total?.cnt ?? 0, page, limit }, statusBreakdown: (breakdown||[]).map((b: any) => ({status:b.status,count:b.cnt})) }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
