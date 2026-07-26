import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse, requireAdminAuth } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN" }, 403);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse([], 200);

    const rows: any[] = await db.prepare(
      "SELECT id, name, company, email, status, created_at FROM developers ORDER BY created_at DESC LIMIT 100"
    ).all();

    return jsonResponse(rows || [], 200);
  } catch (e: any) {
    return jsonResponse({ code: "ERROR", message: e.message }, 500);
  }
};