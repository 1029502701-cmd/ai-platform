import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    try {
        const rows: any[] = await db.prepare("SELECT * FROM prompts ORDER BY updated_at DESC").all();
        return jsonResponse({ prompts: rows || [] }, 200);
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
        await db.prepare(
            "INSERT INTO prompts (name, scenario, content, version, status) VALUES (?, ?, ?, 1, ?)"
        ).bind(body.name, body.scenario, body.content, body.status || "draft").run();
        return jsonResponse({ success: true }, 201);
    } catch (e) {
        return jsonResponse({ code: "CREATE_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
