import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    try {
        const env = context.env as any;
        const db = env.DB;
        const kbId = context.params?.id || '';
        const kb: any = await db.prepare("SELECT * FROM knowledge_bases WHERE id = ?").bind(kbId).first();
        if (!kb) return jsonResponse({ code: "NOT_FOUND" }, 404);
        return jsonResponse({ base: kb }, 200);
    } catch(e) {
        return jsonResponse({ code: "QUERY_ERROR", message: String(e) }, 500);
    }
};

export const onRequestPatch = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    try {
        const env = context.env as any;
        const db = env.DB;
        const kbId = context.params?.id || '';
        const body = await context.request.json() as any;
        const fields: string[] = [];
        const params: any[] = [];
        if (body.name) { fields.push("name=?"); params.push(body.name); }
        if (body.status) { fields.push("status=?"); params.push(body.status); }
        if (fields.length === 0) return jsonResponse({ code: "NO_FIELDS" }, 400);
        params.push(kbId);
        await db.prepare("UPDATE knowledge_bases SET " + fields.join(",") + " WHERE id=?").bind(...params).run();
        return jsonResponse({ success: true }, 200);
    } catch(e) {
        return jsonResponse({ code: "UPDATE_ERROR", message: String(e) }, 500);
    }
};