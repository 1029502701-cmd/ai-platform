import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestPatch = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    const modelId = context.params?.id;
    try {
        const body = await context.request.json() as any;
        if (body.status) {
            await db.prepare("UPDATE ai_models SET status = ? WHERE id = ?").bind(body.status, modelId).run();
            return jsonResponse({ success: true }, 200);
        }
        return jsonResponse({ code: "BAD_REQUEST" }, 400);
    } catch (e) {
        return jsonResponse({ code: "UPDATE_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
