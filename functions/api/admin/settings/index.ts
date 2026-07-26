import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    try {
        const rows: any[] = await db.prepare("SELECT key, value, description FROM system_settings ORDER BY key").all();
        const settings: Record<string,string> = {};
        for (const r of rows) settings[r.key] = r.value;
        return jsonResponse({ settings }, 200);
    } catch (e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};

export const onRequestPatch = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    try {
        const body = await context.request.json() as any;
        for (const [key, value] of Object.entries(body)) {
            await db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)").bind(key, String(value)).run();
        }
        return jsonResponse({ success: true }, 200);
    } catch (e) {
        return jsonResponse({ code: "UPDATE_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
