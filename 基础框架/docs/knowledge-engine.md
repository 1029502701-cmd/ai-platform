<!-- Knowledge Engine & RAG Platform Documentation -->
# Knowledge Engine & RAG Platform

> **Task-013** — Unified Knowledge Engine for all AI applications.

## Architecture Overview

```
Knowledge Sources (PDF/DOCX/TXT/MD/HTML)
        │
        ▼
   Upload Service  ─── POST /api/knowledge/upload
        │
        ▼
   Parser Service   (parseDocument)
        │
        ▼
   Chunk Engine     (chunkBySlidingWindow, 700 char / 150 overlap)
        │
        ▼
   Embedding Service (createEmbeddings - OpenAI/Gemini fallback)
        │
        ▼
   Vector Store     (D1 knowledge_embeddings table, abstracted for future Vectorize)
        │
        ▼
   Retriever        (cosine similarity search + keyword fallback)
        │
        ▼
   Knowledge Service (searchKnowledge, loadKnowledgeContext)
        │
        ▼
   AI Core ─── Prompt Injection {{knowledge}}
```

## Database Schema

### knowledge_bases (already exists from migration 0008)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| key | TEXT UNIQUE | Unique identifier (e.g., "beauty_kb") |
| name | TEXT | Display name |
| description | TEXT | Optional description |
| type | TEXT | Categorization |
| status | TEXT | active/inactive |
| owner_id | TEXT | Owner reference |
| created_by | TEXT | Creator |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

### knowledge_documents (migration 0008)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| knowledge_base_id | INTEGER FK | Reference to knowledge_bases |
| doc_key | TEXT | Document identifier |
| title | TEXT | Display title |
| summary | TEXT | Auto-generated summary |
| content_location | TEXT | External file reference |
| content | TEXT | Inline content |
| metadata | TEXT | JSON metadata |
| status | TEXT | published/draft |
| created_by | TEXT | Uploader |

### knowledge_chunks (migration 0008)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| document_id | INTEGER FK | Source document |
| chunk_index | INTEGER | Order within document |
| content | TEXT | Chunk text |
| metadata | TEXT | JSON metadata |

### knowledge_embeddings (migration 0026)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| chunk_id | INTEGER FK | Source chunk |
| document_id | INTEGER FK | Source document |
| base_id | INTEGER FK | Knowledge base |
| model_name | TEXT | Embedding model used |
| embedding_data | TEXT | JSON array of float values |
| status | TEXT | pending/indexed |

## API Endpoints

### Public Knowledge APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/knowledge` | Admin | List all knowledge bases with counts |
| POST | `/api/knowledge` | Admin | Create a new knowledge base |
| GET | `/api/knowledge/:id` | Admin | Get knowledge base details |
| PATCH | `/api/knowledge/:id` | Admin | Update knowledge base name/status |
| POST | `/api/knowledge/upload` | Admin | Upload document content to a KB |
| POST | `/api/knowledge/reindex` | Admin | Rebuild embeddings for a KB |
| POST | `/api/knowledge/search` | None | Search knowledge (embedding or keyword) |
| POST | `/api/knowledge/context` | None | Assemble knowledge context for AI |

### Admin APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/knowledge/create_base` | Admin | Create knowledge base |
| POST | `/api/admin/knowledge/add_document` | Admin | Add document to KB |
| GET | `/api/admin/knowledge/list_documents` | Admin | List documents in KB |

## Core Services

### 1. Parser Service (`shared/ai/rag_pipeline.ts`)
- Extracts plain text from various MIME types
- Supports: PDF, HTML, Markdown, JSON
- Uses regex-based cleanup for HTML stripping

### 2. Chunk Engine
- Sliding window: 700 character chunks
- 150 character overlap for context preservation
- Token-aware splitting (Chinese ~1 char/token, English ~4 chars/token)
- Breaks at paragraph/sentence boundaries when possible

### 3. Embedding Service (`shared/ai/embedding_service.ts`)
- **Primary**: OpenAI text-embedding-3-small
- **Fallback**: Gemini text-embedding-004
- **Error fallback**: Deterministic hash-based placeholder (384 dims)
- Stores embeddings as JSON arrays in D1
- Abstracted interface for future Vectorize migration

### 4. RAG Pipeline (`shared/ai/rag_pipeline.ts`)
- Combines embedding search with keyword fallback
- Cosine similarity scoring
- Configurable top-K results
- Score threshold filtering
- Max context length capping

### 5. Knowledge Service (`shared/ai/knowledge_service.ts`)
- Single entry point for all AI apps
- `searchKnowledge(query, userId?)` — global search
- `loadKnowledgeContext(scenario, query)` — AI prompt injection
- Returns formatted context text

## AI Integration Flow

```
User Question
    ↓
Scenario Check (knowledge_enabled = true)
    ↓
KnowledgeService.searchKnowledge(query)
    ↓
RAG Pipeline:
  1. Generate embedding for query
  2. Cosine similarity with stored chunks
  3. Top-K matching chunks
  4. Fallback to keyword search if no matches
    ↓
Build context string (max 2000 chars)
    ↓
Prompt Engine injects into {{knowledge}}
    ↓
LLM generates response with knowledge grounding
```

## Chunking Strategy

Default configuration:
- **Chunk size**: 700 characters
- **Overlap**: 150 characters  
- **Split priority**: Paragraph breaks > Sentence boundaries > Character count

Token estimation:
- Chinese characters: 1 char = 1 token
- English: 4 chars = 1 token

## Embedding Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| Provider | openai | openai, gemini |
| Model | text-embedding-3-small | OpenAI embedding model |
| Dimensions | 1536 | OpenAI default |
| Fallback dim | 384 | Hash-based fallback |

Environment variables:
- `OPENAI_API_KEY` — OpenAI API key
- `GOOGLE_AI_API_KEY` — Gemini API key  
- `DEFAULT_AI_PROVIDER` — Default provider name

## Migration Files

1. **0008_knowledge.sql** — Core tables (knowledge_bases, documents, chunks)
2. **0026_knowledge_embeddings.sql** — Embedding vector store

## Indexes

```sql
CREATE INDEX idx_kb_key ON knowledge_bases(key);
CREATE INDEX idx_docs_base ON knowledge_documents(knowledge_base_id);
CREATE INDEX idx_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX idx_kb_embeddings_chunk ON knowledge_embeddings(chunk_id);
CREATE INDEX idx_kb_embeddings_doc ON knowledge_embeddings(document_id);
CREATE INDEX idx_kb_embeddings_base ON knowledge_embeddings(base_id);
CREATE INDEX idx_kb_embeddings_status ON knowledge_embeddings(status);
```

## Future Extensions

- **Vectorize Integration**: Abstracted vector store interface ready for Cloudflare Vectorize
- **RAG Enhancements**: Hybrid search (BM25 + vector), re-ranking
- **Multi-tenant**: Tenant-level isolation for enterprise use
- **Document Versions**: Version tracking for incremental updates
- **Knowledge Quality Scoring**: Embedding density and coverage metrics

## Known Limitations

1. PDF parsing is basic (strips control chars, no structured extraction)
2. DOCX requires external library integration
3. Embedding search disabled by default (useEmbeddingSearch=false) until production API keys are configured
4. No citation/referrer linking in search results yet
5. KV caching layer available but not fully utilized in RAG pipeline