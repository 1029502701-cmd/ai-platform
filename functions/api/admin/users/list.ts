import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED", message: "Admin access required" }, 403);
    const env = context.env as any;
    const db = env.DB;
    const url = new URL(context.request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = (page - 1) * limit;
    const q = url.searchParams.get("q") || "";
    try {
        let where = q ? "WHERE nickname LIKE ? OR id LIKE ?" : "";
        const params: any[] = q ? [`%${q}%`, `%${q}%`] : [];
        const rows: any[] = await db.prepare(
            `SELECT u.id, u.nickname, u.type, u.status, u.role, u.created_at, u.last_login, COUNT(at.id) as usage_count FROM users u LEFT JOIN ai_tasks at ON at.created_by = u.id ${where} GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
        ).bind(...params, limit, offset).all();
        const total: any = await db.prepare(`SELECT COUNT(*) as cnt FROM users ${where}`).bind(...params).first();
        return jsonResponse({ users: rows || [], pagination: { total: total?.cnt ?? 0, page, limit } }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
