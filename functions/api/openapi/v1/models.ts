import type { PagesFunction } from "@cloudflare/workers-types";
import { requireOpenApiAuth, jsonResponse } from "../../_openapi_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireOpenApiAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ models: [] }, 200);

    const rows: any[] = await db.prepare(
      "SELECT id, name, provider, model_id, status, params FROM ai_models WHERE status = 'active' ORDER BY sort_order ASC"
    ).all();

    return jsonResponse({
      models: (rows || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        provider: r.provider,
        modelId: r.model_id,
        status: r.status,
        params: r.params ? JSON.parse(String(r.params)) : {},
      })),
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};