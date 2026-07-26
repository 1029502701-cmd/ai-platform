import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../../_auth.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    const taskId = context.params?.id;
    try {
        const task: any = await db.prepare("SELECT * FROM ai_tasks WHERE id = ?").bind(taskId).first();
        if (!task) return jsonResponse({ code: "NOT_FOUND" }, 404);
        if (task.status !== "failed") return jsonResponse({ code: "INVALID_STATUS", message: "Can only retry failed tasks" }, 400);
        await db.prepare("UPDATE ai_tasks SET status='pending', retry_count=0, error=NULL WHERE id=?").bind(taskId).run();
        return jsonResponse({ success: true, message: "Task reset to pending" }, 200);
    } catch (e) {
        return jsonResponse({ code: "RETRY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
