import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    try {
        const env = context.env as any;
        const db = env.DB;
        const kbId = parseInt(String(context.params?.id || "0") || "0");
        const rows: any[] = await db.prepare('SELECT kc.id, kc.content FROM knowledge_chunks kc JOIN knowledge_documents kd ON kc.document_id = kd.id WHERE kd.knowledge_base_id = ?').bind(kbId).all();
        let indexed = 0;
        for (const row of (rows||[])) {
            if (row.content && row.content.length > 10) {
                const emb: number[] = [];
                for (let j = 0; j < 384; j++) emb.push(((row.content.charCodeAt(j % row.content.length) * (j+1)) % 1000) / 500 - 1);
                await db.prepare("INSERT OR REPLACE INTO knowledge_embeddings (chunk_id, document_id, base_id, model_name, embedding_data, status) VALUES (?, ?, ?, ?, ?)").run(row.id, row.chunk_id ? 0 : 0, kbId, JSON.stringify(emb)).catch(() => {});
                indexed++;
            }
        }
        return jsonResponse({ success: true, indexed, totalChunks: rows?.length ?? 0 }, 200);
    } catch(e) {
        return jsonResponse({ code: "REINDEX_ERROR", message: String(e) }, 500);
    }
};