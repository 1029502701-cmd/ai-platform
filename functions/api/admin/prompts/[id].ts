import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    const promptId = context.params?.id;
    try {
        const row: any = await db.prepare("SELECT * FROM prompts WHERE id = ?").bind(promptId).first();
        if (!row) return jsonResponse({ code: "NOT_FOUND" }, 404);
        const versions: any[] = await db.prepare("SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY version DESC").bind(promptId).all();
        return jsonResponse({ prompt: row, versions: versions || [] }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};

export const onRequestPatch = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    const promptId = context.params?.id;
    try {
        const body = await context.request.json() as any;
        if (body.content) {
            // Save current as version before updating
            const current: any = await db.prepare("SELECT content, version FROM prompts WHERE id=?").bind(promptId).first();
            if (current) {
                await db.prepare("INSERT INTO prompt_versions (prompt_id, version, content) VALUES (?, ?, ?)")
                    .bind(promptId, current.version + 1, current.content).run();
            }
            await db.prepare("UPDATE prompts SET content=?, status=?, version=version+1, updated_at=datetime('now') WHERE id=?")
                .bind(body.content, body.status || "draft", promptId).run();
        }
        return jsonResponse({ success: true }, 200);
    } catch (e) {
        return jsonResponse({ code: "UPDATE_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
