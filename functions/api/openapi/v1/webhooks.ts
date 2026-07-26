import type { PagesFunction } from "@cloudflare/workers-types";
import { requireOpenApiAuth, jsonResponse } from "../../_openapi_auth.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireOpenApiAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ code: "DB_UNAVAILABLE" }, 500);

    const body = await context.request.json() as any;
    const { url, events = ["*"] } = body;
    if (!url) return jsonResponse({ code: "MISSING_URL" }, 400);

    // Generate HMAC secret
    const secret = "whsec_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 12);

    const res: any = await db.prepare(
      "INSERT INTO webhooks (developer_id, url, events, secret) VALUES (?, ?, ?, ?)"
    ).run(auth.developerId, url, JSON.stringify(events), secret);

    return jsonResponse({
      success: true,
      data: { id: res.lastInsertRowid, url, events, secret },
    }, 201);
  } catch (e: any) {
    return jsonResponse({ code: "ERROR", message: e.message }, 500);
  }
};

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireOpenApiAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ webhooks: [] });

    const rows: any[] = await db.prepare(
      "SELECT id, url, events, status, created_at FROM webhooks WHERE developer_id = ? ORDER BY created_at DESC"
    ).bind(auth.developerId).all();

    return jsonResponse({
      webhooks: (rows || []).map((r: any) => ({ ...r, events: JSON.parse(String(r.events || '[]')) })),
    });
  } catch (e: any) {
    return jsonResponse({ code: "ERROR", message: e.message }, 500);
  }
};