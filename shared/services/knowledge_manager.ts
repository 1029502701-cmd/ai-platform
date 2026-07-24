// Knowledge Manager
// Responsibilities:
// - manage knowledge bases
// - manage documents (store metadata, content pointer)
// - chunk documents (simple split)
// - search chunks (keyword search with filters)
// - assemble context (top-K chunks concatenated, respect max length)
// - use KV cache AI_KB_CACHE for search/context caching

type KnowledgeBase = {
  id: number;
  key: string;
  name: string;
  description?: string;
  type?: string;
  status?: string;
  owner_id?: string;
};


const inMemoryBases: Record<string, KnowledgeBase> = {};

export async function loadBasesFromBindings(env?: any) {
  try {
    const kv = env?.AI_KB_CACHE;
    if (kv && kv.get) {
      const raw = await kv.get('kb_bases_json');
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const b of parsed) inMemoryBases[b.key] = b;
        return;
      }
    }
  } catch (e) {
    // ignore
  }

  try {
    const db = env?.DB;
    if (db && db.prepare) {
      const res = await db.prepare('SELECT id, key, name, description, type, status, owner_id FROM knowledge_bases').all();
      if (res && res.results) {
        for (const row of res.results) {
          inMemoryBases[row.key] = { id: row.id, key: row.key, name: row.name, description: row.description, type: row.type, status: row.status, owner_id: row.owner_id };
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

export async function invalidateKbCache(env?: any) {
  try {
    const kv = env?.AI_KB_CACHE;
    if (kv && kv.put) {
      await kv.put('kb_bases_json', '');
    }
  } catch (e) {}
  await loadBasesFromBindings(env);
}

export function getBaseFromMemory(key: string): KnowledgeBase | null {
  return inMemoryBases[key] || null;
}

export function listBasesFromMemory(): KnowledgeBase[] { return Object.values(inMemoryBases); }

// Create base
export async function createBaseInDB(env: any, payload: { key: string; name: string; description?: string; type?: string; owner_id?: string; created_by?: string }) {
  const db = env?.DB; if (!db || !db.prepare) throw new Error('DB_NOT_AVAILABLE');
  await db.prepare('INSERT INTO knowledge_bases (key, name, description, type, owner_id, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(payload.key, payload.name, payload.description || null, payload.type || null, payload.owner_id || null, payload.created_by || null);
  await invalidateKbCache(env);
}

// Add document (content inline or content_location)
export async function addDocumentInDB(env: any, payload: { baseKey: string; doc_key?: string; title?: string; content?: string; content_location?: string; metadata?: any; created_by?: string; status?: string }) {
  const db = env?.DB; if (!db || !db.prepare) throw new Error('DB_NOT_AVAILABLE');
  const base = await db.prepare('SELECT id FROM knowledge_bases WHERE key = ?').get(payload.baseKey);
  if (!base || !base.id) throw new Error('KB_NOT_FOUND');
  const res = await db.prepare('INSERT INTO knowledge_documents (knowledge_base_id, doc_key, title, summary, content_location, content, metadata, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(base.id, payload.doc_key || null, payload.title || null, null, payload.content_location || null, payload.content || null, payload.metadata ? JSON.stringify(payload.metadata) : null, payload.status || 'published', payload.created_by || null);
  const docId = (res && (res as any).lastInsertRowid) ? (res as any).lastInsertRowid : null;
  // chunking: simple split by paragraphs up to 800 chars
  if (payload.content && docId) {
    await chunkAndStore(db, docId, payload.content);
  }
  return docId;
}

async function chunkAndStore(db: any, docId: number, content: string) {
  // split by double newline or sentences, aim for ~700 char chunks
  const paragraphs = content.split(/\n\n+/);
  let chunks: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= 800) chunks.push(p.trim());
    else {
      for (let i = 0; i < p.length; i += 700) {
        chunks.push(p.substring(i, i + 700).trim());
      }
    }
  }
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    await db.prepare('INSERT INTO knowledge_chunks (document_id, chunk_index, content) VALUES (?, ?, ?)').run(docId, i, c);
  }
}

// List documents in base
export async function listDocuments(env: any, baseKey: string) {
  const db = env?.DB; if (!db || !db.prepare) throw new Error('DB_NOT_AVAILABLE');
  const base = await db.prepare('SELECT id FROM knowledge_bases WHERE key = ?').get(baseKey);
  if (!base || !base.id) throw new Error('KB_NOT_FOUND');
  const res = await db.prepare('SELECT id, doc_key, title, summary, status, created_at FROM knowledge_documents WHERE knowledge_base_id = ?').all(base.id);
  return res.results || [];
}

// Simple search: keyword across chunks and document title/content
export async function searchKnowledge(env: any, params: { query: string; baseKey?: string; topK?: number }) {
  const db = env?.DB; if (!db || !db.prepare) throw new Error('DB_NOT_AVAILABLE');
  const topK = params.topK || 5;
  const q = params.query.trim().toLowerCase();
  // build SQL: search chunks matching LIKE '%q%'
  const base = params.baseKey ? await db.prepare('SELECT id FROM knowledge_bases WHERE key = ?').get(params.baseKey) : null;
  const baseClause = base && base.id ? 'AND kd.knowledge_base_id = ' + base.id : '';
  const sql = `SELECT kc.id as chunk_id, kc.content as excerpt, kd.id as doc_id, kd.title as title, (CASE WHEN LOWER(kc.content) LIKE ? THEN 1 ELSE 0 END) as score FROM knowledge_chunks kc JOIN knowledge_documents kd ON kc.document_id = kd.id WHERE LOWER(kc.content) LIKE ? ${baseClause} ORDER BY score DESC LIMIT ?`;
  const likeQ = '%' + q + '%';
  const res = await db.prepare(sql).all(likeQ, likeQ, topK);
  return res.results || [];
}

// Assemble context: concat top chunks, ensure total length under charLimit
export async function assembleContext(env: any, params: { query: string; baseKey?: string; topK?: number; charLimit?: number }) {
  const cacheKey = `ctx:${params.baseKey || 'global'}:${params.query}:${params.topK || 5}:${params.charLimit || 2000}`;
  try {
    const kv = env?.AI_KB_CACHE;
    if (kv && kv.get) {
      const cached = await kv.get(cacheKey);
      if (cached) return { context: cached, cached: true };
    }
  } catch (e) {}

  const results = await searchKnowledge(env, { query: params.query, baseKey: params.baseKey, topK: params.topK });
  const charLimit = params.charLimit || 2000;
  let contextParts: string[] = [];
  let len = 0;
  for (const r of results) {
    const text = String(r.excerpt || r.content || '');
    if (len + text.length > charLimit) break;
    contextParts.push(text);
    len += text.length;
  }
  const context = contextParts.join('\n\n');
  try {
    const kv = env?.AI_KB_CACHE;
    if (kv && kv.put) {
      await kv.put(cacheKey, context, { expirationTtl: 300 });
    }
  } catch (e) {}
  return { context, cached: false };
}
