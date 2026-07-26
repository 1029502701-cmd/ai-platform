import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse, requireOpenApiAuth } from "../_openapi_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireOpenApiAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ keys: [] }, 200);

    const rows: any[] = await db.prepare(
      "SELECT id, name, status, created_at, permissions FROM api_keys WHERE developer_id = ? ORDER BY created_at DESC"
    ).bind(auth.developerId).all();

    return jsonResponse({
      keys: (rows || []).map((r: any) => ({ ...r, permissions: JSON.parse(String(r.permissions || '[]')) })),
    }, 200);
  } catch (e: any) {
    return jsonResponse({ code: "ERROR", message: e.message }, 500);
  }
};