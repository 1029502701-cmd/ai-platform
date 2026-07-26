-- knowledge_embeddings: vector store for semantic search (D1-compatible)
-- Each embedding is stored as a JSON array string; for future migration to Vectorize/DashScope we keep the interface abstract.
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chunk_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    base_id INTEGER NOT NULL,
    model_name TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_data TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (chunk_id) REFERENCES knowledge_chunks(id),
    FOREIGN KEY (document_id) REFERENCES knowledge_documents(id),
    FOREIGN KEY (base_id) REFERENCES knowledge_bases(id)
);

CREATE INDEX IF NOT EXISTS idx_kb_embeddings_chunk ON knowledge_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_doc ON knowledge_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_base ON knowledge_embeddings(base_id);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_status ON knowledge_embeddings(status);
