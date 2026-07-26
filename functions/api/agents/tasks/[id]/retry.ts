import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../../../_auth.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const db = (context.env as any)?.DB;
    const taskId = context.params?.id || "";
    if (!db || !db.prepare) return jsonResponse({ code: "DB_NOT_READY" }, 503);

    const userTask: any = await db.prepare("SELECT id FROM agent_tasks WHERE id = ? AND user_id = ?").bind(taskId, auth.user.id).first();
    if (!userTask) return jsonResponse({ code: "NOT_FOUND" }, 404);

    await db.prepare("UPDATE agent_tasks SET status = '" + "'pending'" + "', started_at = NULL, finished_at = NULL, result = NULL, error = NULL, duration_ms = NULL WHERE id = ?").run(taskId);
    return jsonResponse({ success: true, taskId, status: "pending" }, 200);
  } catch (e) {
    return jsonResponse({ code: "RETRY_ERROR", message: String(e) }, 500);
  }
};
