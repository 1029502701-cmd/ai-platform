import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse, requireAdminAuth } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN" }, 403);
  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse([], 200);
    const rows: any[] = await db.prepare("SELECT id, slug, name, category, status, rating, install_count, price_cents, version, created_at FROM marketplace_apps ORDER BY install_count DESC").all();
    return jsonResponse(rows || [], 200);
  } catch (e: any) { return jsonResponse({ error: e.message }, 500); }
};

export const onRequestPatch = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN" }, 403);
  try {
    const body = await context.request.json() as any;
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse([], 200);
    const parts: string[] = [];
    const params: any[] = [];
    if (body.status) { parts.push("status = ?"); params.push(body.status); }
    if (body.is_featured !== undefined) { parts.push("is_featured = ?"); params.push(body.is_featured); }
    parts.push("updated_at = datetime('now')");
    const setClause = parts.join(", ");
    await db.prepare("UPDATE marketplace_apps SET " + setClause + " WHERE slug = ?").run(...params, body.slug);
    return jsonResponse({ success: true }, 200);
  } catch (e: any) { return jsonResponse({ error: e.message }, 500); }
};