import { getLogger } from "../logger";

import { createEmbeddings } from "./embedding_service";

const log = getLogger("rag_pipeline");

// ============================================================
// Vector similarity helper (cosine similarity in JS)
// ============================================================
export function cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length) return 0;
    const len = Math.min(a.length, b.length);
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < len; i++) { dot += a[i] * b[i]; magA += a[i]*a[i]; magB += b[i]*b[i]; }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ============================================================
// Document Parser Service (lightweight, extracts plain text)
// ============================================================
export async function parseDocument(raw: ArrayBuffer | string, mimeType: string): Promise<string> {
    // If it's ArrayBuffer (binary file like PDF/DOCX), extract raw bytes
    let text = "";
    if (raw instanceof ArrayBuffer) {
        const decoder = new TextDecoder("utf-8", { fatal: true });
        try { text = decoder.decode(raw); } catch { text = new TextDecoder().decode(new Uint8Array(raw)); }
    } else {
        text = raw;
    }
    // Basic MIME-based cleanup
    switch (mimeType.toLowerCase()) {
        case "application/pdf":
            // Raw PDF binary → strip control chars
            text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
            break;
        case "text/html":
        case "application/xhtml+xml":
            text = cleanHtml(text);
            break;
        case "application/json":
            try { const obj = JSON.parse(text); text = JSON.stringify(obj, null, 2); } catch {}
            break;
    }
    // Strip Markdown headers for readability
    text = text.replace(/^#{1,6}\s+/gm, "").replace(/[-=~]{3,}/gm, "");
    return text.trim();
}

function cleanHtml(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<p[^>]*>/gi, "\n")
        .replace(/<\/p>/gi, "")
        .replace(/<li[^>]*>/gi, "\n- ")
        .replace(/<\/li>/gi, "")
        .replace(/<h[1-6][^>]*>/gi, "\n## ")
        .replace(/<\/h[1-6]>/gi, " ##")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// ============================================================
// Chunk Engine — sliding window with token-aware splitting
// ============================================================
export interface ChunkResult { content: string; tokenCount: number; metadata: Record<string, any>; }

export function chunkBySlidingWindow(text: string, chunkSize: number = 700, overlap: number = 150): ChunkResult[] {
    if (text.length <= chunkSize) return [{ content: text, tokenCount: estimateTokens(text), metadata: {} }];
    const chunks: ChunkResult[] = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        // Try to break at sentence boundary or paragraph break
        let cutPoint = end;
        if (end < text.length) {
            const slice = text.substring(start, end);
            const lastNewline = slice.lastIndexOf("\n", -1);
            if (lastNewline > chunkSize * 0.3) cutPoint = start + lastNewline + 1;
            else {
                const lastSpace = slice.lastIndexOf(" ", Math.floor(slice.length * 0.7));
                if (lastSpace > chunkSize * 0.3) cutPoint = start + lastSpace;
            }
        }
        const chunk = text.substring(start, cutPoint).trim();
        if (chunk) {
            chunks.push({ content: chunk, tokenCount: estimateTokens(chunk), metadata: { start_char: start, end_char: cutPoint } });
        }
        start = cutPoint - overlap;
        if (start >= text.length) break;
    }
    return chunks;
}

function estimateTokens(text: string): number {
    // Rough token count (Chinese: ~1 char/token, English: ~4 chars/token)
    const cnChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const enChars = text.length - cnChars;
    return cnChars + Math.ceil(enChars / 4);
}

// ============================================================
// Main RAG Pipeline
// ============================================================
export interface KnowledgeSearchParams {
    query: string;
    baseId?: number;
    topK?: number;
    scoreThreshold?: number;
    maxContextLength?: number;
    useEmbeddingSearch?: boolean;
}

export interface SearchResult {
    chunks: Array<{ content: string; docTitle: string; chunkId: number; score: number }>;
    totalMatches: number;
    context: string;
}

export async function searchKnowledgePipeline(env: any, params: KnowledgeSearchParams): Promise<SearchResult> {
    const db = env?.DB;
    if (!db || !db.prepare) throw new Error("DB_NOT_AVAILABLE");

    const topK = params.topK || 5;
    const threshold = params.scoreThreshold || 0;
    const maxLen = params.maxContextLength || 2000;
    const q = params.query.trim();

    let results: Array<{ chunk_id: number; excerpt: string; doc_title: string; score: number }>;

    if (params.useEmbeddingSearch && topK <= 10) {
        // Embedding-based search
        const embProvider = env.DEFAULT_AI_PROVIDER || "openai";
        const embeddings = await createEmbeddings(env, [q], embProvider);
        if (!embeddings?.[0]) throw new Error("EMBED_FAILED");
        const queryVec = embeddings[0];

        // Load indexed chunks for the specified base (or all)
        const whereClause = params.baseId ? "WHERE ke.base_id = ? AND ke.status = 'indexed'" : "WHERE ke.status = 'indexed'";
        const bindArgs: any[] = params.baseId ? [params.baseId] : [];
        const rows: any[] = await db.prepare(
            `SELECT kc.chunk_id, kc.content as excerpt, kd.title as doc_title,
           ke.embedding_data as emb_data FROM knowledge_embeddings ke
     JOIN knowledge_chunks kc ON kc.id = ke.chunk_id
     JOIN knowledge_documents kd ON kd.id = ke.document_id
     ${whereClause}
     ORDER BY ke.created_at DESC`
        ).bind(...bindArgs).all();

        // Compute cosine similarity
        const scored = (rows || []).map(r => ({
            ...r,
            score: cosineSimilarity(queryVec, JSON.parse(r.emb_data || "[]")),
        })).filter(s => s.score >= threshold).sort((a,b) => b.score - a.score);

        results = scored.slice(0, topK * 2).map((s, _i) => ({
            chunk_id: s.chunk_id,
            excerpt: s.excerpt,
            doc_title: s.doc_title || "Unknown",
            score: s.score,
        }));

        // Fallback to keyword if no embedding matches
        if (results.length === 0) {
            log.info("No embedding results, falling back to keyword search");
            results = await keywordFallback(db, q, params.baseId, topK);
        }
    } else {
        // Keyword fallback (existing logic)
        results = await keywordFallback(db, q, params.baseId, topK);
    }

    // Build context from top results
    const contextParts: string[] = [];
    let len = 0;
    for (const r of results) {
        const text = String(r.excerpt || "");
        if (len + text.length > maxLen) break;
        contextParts.push(text);
        len += text.length;
    }

    return {
        chunks: results.map(r => ({ content: r.excerpt, docTitle: r.doc_title, chunkId: r.chunk_id, score: Number(r.score.toFixed(4)) })),
        totalMatches: results.length,
        context: contextParts.join("\n\n"),
    };
}

async function keywordFallback(db: any, query: string, baseId?: number, topK: number = 5): Promise<Array<{chunk_id:number;excerpt:string;doc_title:string;score:number}>> {
    const likeQ = "%" + query.trim().toLowerCase() + "%";
    const baseClause = baseId ? "AND kd.knowledge_base_id = " + baseId : "";
    const sql = `SELECT kc.id as chunk_id, kc.content as excerpt, kd.title as doc_title, (CASE WHEN LOWER(kc.content) LIKE ? THEN 1 ELSE 0 END) as score FROM knowledge_chunks kc JOIN knowledge_documents kd ON kc.document_id = kd.id WHERE LOWER(kc.content) LIKE ? ${baseClause} ORDER BY score DESC LIMIT ?`
    const res = await db.prepare(sql).all(likeQ, likeQ, topK * 2);
    return (res?.results || []).map((r: any) => ({ chunk_id: r.chunk_id, excerpt: r.excerpt, doc_title: r.doc_title || "Unknown", score: r.score || 0 }));
}
