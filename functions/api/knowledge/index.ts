import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    try {
        const env = context.env as any;
        const db = env.DB;
        const rows: any[] = await db.prepare("SELECT id, key, name, description, status, owner_id, created_at FROM knowledge_bases ORDER BY created_at DESC").all();
        // Add doc counts
        for (const kb of rows) {
            const dc: any = await db.prepare("SELECT COUNT(*) as c FROM knowledge_documents WHERE knowledge_base_id = ?").bind(kb.id).first();
            const cc: any = await db.prepare("SELECT COUNT(*) as c FROM knowledge_chunks WHERE document_id IN (SELECT id FROM knowledge_documents WHERE knowledge_base_id = ?)").bind(kb.id).first();
            const ec: any = await db.prepare("SELECT COUNT(*) as c FROM knowledge_embeddings WHERE base_id = ? AND status = 'indexed'").bind(kb.id).first();
            (kb as any).docCount = dc?.c || 0;
            (kb as any).chunkCount = cc?.c || 0;
            (kb as any).indexedEmbeddings = ec?.c || 0;
        }
        return jsonResponse({ bases: rows || [] }, 200);
    } catch(e) {
        return jsonResponse({ code: "QUERY_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    try {
        const env = context.env as any;
        const db = env.DB;
        const body = await context.request.json() as any;
        await db.prepare("INSERT INTO knowledge_bases (key, name, description, type, owner_id) VALUES (?, ?, ?, 'default', ?)").run(body.key, body.name, body.description || null, body.owner_id || null);
        return jsonResponse({ success: true, message: "Knowledge base created" }, 201);
    } catch(e) {
        return jsonResponse({ code: "CREATE_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
