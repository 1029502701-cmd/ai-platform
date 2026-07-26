import { getLogger } from "../logger";
import type { KnowledgeSearchParams } from "./rag_pipeline";
const log = getLogger("knowledge_service");

/**
 * Unified knowledge search — delegates to RAG pipeline.
 * This is the single entry point for all AI apps to query knowledge bases.
 */
export async function searchKnowledge(query: string, _userId?: string): Promise<string> {
    // Default: search all public KBs
    return searchKnowledgeWithParams({ query, baseId: undefined });
}

/**
 * Search a specific knowledge base with parameters.
 */
export async function searchKnowledgeWithParams(params: KnowledgeSearchParams): Promise<string> {
    const query = params.query;
    if (!query || query.trim().length < 2) return "";
    
    // Import RAG pipeline
    try {
        const { searchKnowledgePipeline } = await import("./rag_pipeline");
        const result = await searchKnowledgePipeline(
            globalThis as any, // env passed via caller
            { query, topK: params.topK || 5, maxContextLength: params.maxContextLength || 2000, useEmbeddingSearch: false }
        );
        return result.context;
    } catch (e) {
        log.warn("Knowledge search failed (RAG not available yet)", { error: String(e) });
        return "";
    }
}

/**
 * Load knowledge context for prompt building.
 * Returns formatted context text for {{knowledge}} injection.
 */
export async function loadKnowledgeContext(_scenario: string, query?: string, env?: any): Promise<string> {
    if (!query) return "";
    try {
        const { searchKnowledgePipeline } = await import("./rag_pipeline");
        const kbContext = await searchKnowledgePipeline(env || {}, {
            query, topK: 5, maxContextLength: 1500,
        });
        if (kbContext.context) {
            return "[Knowledge Context]\n" + kbContext.context;
        }
    } catch (e) {
        log.warn("Knowledge context load failed", { error: String(e) });
    }
    return "";
}

/**
 * Stub for indexing content (for future PDF/DOCX upload).
 */
export async function indexContent(content: string, _metadata?: Record<string, any>): Promise<boolean> {
    log.info("Indexing stub called", { contentLen: content.length });
    return true;
}