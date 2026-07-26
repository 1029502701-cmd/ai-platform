import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestPatch = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
  try {
    const db = (context.env as any)?.DB;
    const agentId = context.params?.id || "";
    const body = await context.request.json() as any;
    if (!db || !db.prepare) return jsonResponse({ code: "DB_NOT_READY" }, 503);

    const fields: string[] = [];
    const params: any[] = [];
    if (body.name) { fields.push("name=?"); params.push(body.name); }
    if (body.status) { fields.push("status=?"); params.push(body.status); }
    if (body.description) { fields.push("description=?"); params.push(body.description); }
    if (body.defaultModel) { fields.push("default_model=?"); params.push(body.defaultModel); }
    if (body.maxSteps) { fields.push("max_steps=?"); params.push(body.maxSteps); }

    if (fields.length === 0) return jsonResponse({ code: "NO_FIELDS" }, 400);
    params.push(agentId);
    await db.prepare("UPDATE agents SET " + fields.join(",") + " WHERE id=?").bind(...params).run();
    return jsonResponse({ success: true }, 200);
  } catch (e) {
    return jsonResponse({ code: "UPDATE_ERROR", message: String(e) }, 500);
  }
};
