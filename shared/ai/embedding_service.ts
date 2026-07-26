import { getLogger } from "../logger";
const log = getLogger("embedding_service");

export interface EmbeddingRequest {
    texts: string[];
    model?: string;
}

export interface EmbeddingResponse {
    embeddings: number[][];
    model: string;
    tokens: number;
}

// Unused but kept for future KV cache


async function getOpenAIEmbedding(texts: string[], apiKey: string): Promise<number[][]> {
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
    });
    if (!resp.ok) { const err = await resp.text(); log.error("OpenAI embed failed", { status: resp.status }); throw new Error("Embedding error: " + err); }
    const data: any = await resp.json();
    return (data?.data || []).map((d: any) => d.embedding);
}

async function getGeminiEmbedding(texts: string[], _apiKey: string): Promise<number[][]> {
    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: texts.map(t => ({ model: "models/text-embedding-004", content: { parts: [{ text: t }] } })) }),
    });
    if (!resp.ok) { const err = await resp.text(); log.error("Gemini embed failed", { status: resp.status }); throw new Error("Embedding error: " + err); }
    const data: any = await resp.json();
    return (data?.embeddings || []).map((e: any) => e.values);
}

export async function createEmbeddings(env: any, texts: string[], provider?: string): Promise<number[][]> {
    if (texts.length === 0) return [];
    const p = provider || (env.DEFAULT_AI_PROVIDER || "openai").toLowerCase();
    let embeddings: number[][];
    try {
        if (p === "gemini") {
            embeddings = await getGeminiEmbedding(texts, env.GOOGLE_AI_API_KEY || "");
        } else {
            embeddings = await getOpenAIEmbedding(texts, env.OPENAI_API_KEY || "");
        }
    } catch(e) {
        log.warn("Embedding fallback to mock", { error: String(e), provider: p });
        // Fallback: simple hash-based placeholder embedding
        embeddings = texts.map((t, _i) => {
            const h = hashCode(t);
            const emb: number[] = [];
            for (let jj = 0; jj < 384; jj++) emb.push(((h * (jj+1)) % 1000) / 500 - 1);
            return emb;
        });
    }
    return embeddings;
}

// Simple hash for deterministic fallback embeddings
function hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return h;
}

// Store embeddings in D1
export async function saveEmbeddings(env: any, chunkId: number, docId: number, baseId: number, data: number[], modelName: string): Promise<void> {
    const db = env?.DB;
    if (!db || !db.prepare) return;
    await db.prepare(
        'INSERT OR REPLACE INTO knowledge_embeddings (chunk_id, document_id, base_id, model_name, embedding_data, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(chunkId, docId, baseId, modelName, JSON.stringify(data), 'indexed').run();
    log.info("Embedding saved", { chunkId, modelName });
}

// Retrieve embeddings for a base (used for vector similarity search)
export async function loadBaseEmbeddings(env: any, baseId: number): Promise<Array<{ chunk_id: number; doc_id: number; embedding: number[] }>> {
    const db = env?.DB;
    if (!db || !db.prepare) return [];
    const rows: any[] = await db.prepare(
        `SELECT chunk_id, document_id, embedding_data FROM knowledge_embeddings WHERE base_id = ? AND status = 'indexed'`
    ).bind(baseId).all();
    return (rows || []).map(r => ({ chunk_id: r.chunk_id, doc_id: r.document_id, embedding: JSON.parse(r.embedding_data || '[]') }));
}
