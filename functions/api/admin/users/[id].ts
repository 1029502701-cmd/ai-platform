import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    const userId = context.params?.id;
    try {
        const user: any = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
        if (!user) return jsonResponse({ code: "NOT_FOUND", message: "User not found" }, 404);
        const tasks: any = await db.prepare("SELECT id, status, model_name, created_at, duration_ms FROM ai_tasks WHERE created_by = ? ORDER BY created_at DESC LIMIT 20").bind(userId).all();
        const taskCount: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_tasks WHERE created_by = ?").bind(userId).first();
        return jsonResponse({ user, recentTasks: tasks || [], taskCount: taskCount?.cnt ?? 0 }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};

export const onRequestPatch = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    const userId = context.params?.id;
    try {
        const body = await context.request.json() as any;
        if (body.status) {
            await db.prepare("UPDATE users SET status = ?, last_login = last_login WHERE id = ?").bind(body.status, userId).run();
            return jsonResponse({ success: true, message: "User status updated" }, 200);
        }
        return jsonResponse({ code: "BAD_REQUEST", message: "No update fields" }, 400);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
