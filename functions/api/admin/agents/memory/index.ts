import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
  try {
    const db = (context.env as any)?.DB;
    if (!db || !db.prepare) return jsonResponse({ code: "DB_NOT_READY" }, 503);

    const totalCount: any = await db.prepare("SELECT COUNT(*) as c FROM agent_memory").first();
    const byType: any = await db.prepare(
      "SELECT memory_type, COUNT(*) as cnt FROM agent_memory GROUP BY memory_type"
    ).all();

    return jsonResponse({ total: totalCount?.c || 0, byType: byType?.results || [] }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
