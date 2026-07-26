import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
  try {
    const db = (context.env as any)?.DB;
    if (!db || !db.prepare) return jsonResponse({ code: "DB_NOT_READY" }, 503);

    const rows: any[] = await db.prepare(
      "SELECT at.*, a.key as agentKey, a.name as agentName, u.nickname as userName " +
      "FROM agent_tasks at JOIN agents a ON a.id = at.agent_id " +
      "LEFT JOIN users u ON u.id = at.user_id ORDER BY at.created_at DESC LIMIT 100"
    ).all();

    return jsonResponse({ tasks: rows || [] }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
