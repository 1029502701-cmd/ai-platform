import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    try {
        const providers: any[] = await db.prepare("SELECT * FROM ai_providers ORDER BY name").all();
        const models: any[] = await db.prepare("SELECT * FROM ai_models ORDER BY provider_id, priority DESC").all();
        return jsonResponse({ providers: providers || [], models: models || [] }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    try {
        const body = await context.request.json() as any;
        if (body.provider) {
            await db.prepare("INSERT INTO ai_providers (name, display_name, base_url, status) VALUES (?, ?, ?, 'active')").bind(body.provider, body.displayName || body.provider, body.baseUrl || "").run();
            return jsonResponse({ success: true }, 201);
        }
        if (body.model && body.providerId) {
            await db.prepare("INSERT INTO ai_models (provider_id, model_name, display_name, status, priority) VALUES (?, ?, ?, 'active', ?)").bind(body.providerId, body.model, body.displayName || body.model, body.priority || 50).run();
            return jsonResponse({ success: true }, 201);
        }
        return jsonResponse({ code: "BAD_REQUEST", message: "Missing provider or model data" }, 400);
    } catch (e) {
        return jsonResponse({ code: "CREATE_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
