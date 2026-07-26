import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

function chunkBySize(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = []; let start = 0;
    while (start < text.length) {
        const end = Math.min(start + size, text.length);
        let cutPoint = end;
        if (end < text.length) {
            const slice = text.substring(start, end);
            const nl = slice.lastIndexOf("\n");
            if (nl > size * 0.3) cutPoint = start + nl + 1;
        }
        chunks.push(text.substring(start, cutPoint).trim());
        start = cutPoint - overlap;
        if (start >= text.length) break;
    }
    return chunks;
}

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    try {
        const env = context.env as any;
        const db = env.DB;
        const kbId = parseInt(String(context.params?.id || "0") || "0");
        const { title, content, mimeType: _mt, metadata } = await context.request.json() as any;
        if (!title || !content) return jsonResponse({ code: "BAD_REQUEST", message: "title and content required" }, 400);
        let parsedText = typeof content === "string" ? content : new TextDecoder().decode(new Uint8Array(content));
        const res: any = await db.prepare("INSERT INTO knowledge_documents (knowledge_base_id, title, summary, content_location, metadata, status) VALUES (?, ?, ?, ?, ?, ?)").run(kbId, title, parsedText.slice(0,500), "inline:"+Date.now(), metadata ? JSON.stringify(metadata) : null, "published");
        const docId = res.lastInsertRowid as number;
        const chunks = chunkBySize(parsedText, 700, 150);
        for (let i = 0; i < chunks.length; i++) {
            await db.prepare('INSERT INTO knowledge_chunks (document_id, chunk_index, content) VALUES (?, ?, ?)').run(docId, i, chunks[i]);
        }
        return jsonResponse({ success: true, docId, chunkCount: chunks.length }, 201);
    } catch(e) {
        return jsonResponse({ code: "UPLOAD_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};