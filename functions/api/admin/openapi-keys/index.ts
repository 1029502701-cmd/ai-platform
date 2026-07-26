import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse, requireAdminAuth } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN" }, 403);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse([], 200);

    const rows: any[] = await db.prepare(
      "SELECT ak.id, ak.name, ak.status, ak.created_at, ak.daily_quota, ak.monthly_quota, d.name as developer_name FROM api_keys ak LEFT JOIN developers d ON ak.developer_id = d.id ORDER BY ak.created_at DESC LIMIT 100"
    ).all();

    return jsonResponse(rows || [], 200);
  } catch (e: any) {
    return jsonResponse({ code: "ERROR", message: e.message }, 500);
  }
};