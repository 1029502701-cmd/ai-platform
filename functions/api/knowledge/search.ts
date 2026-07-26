import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse } from "../../_auth.ts";
import { searchKnowledgePipeline } from "../../../shared/ai/rag_pipeline";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
    try {
        const env = context.env as any;
        const { query, baseId, topK = 5, maxContextLength = 2000, useEmbeddingSearch = false } = await context.request.json() as any;
        if (!query) return jsonResponse({ code: "BAD_REQUEST", message: "query is required" }, 400);

        const result = await searchKnowledgePipeline(env, {
            query, baseId, topK: topK || 5, scoreThreshold: 0.3, maxContextLength, useEmbeddingSearch: !!useEmbeddingSearch,
        });
        return jsonResponse({
            success: true, data: {
                chunks: result.chunks.map((c:any) => ({ content: c.content, docTitle: c.docTitle, score: c.score, chunkId: c.chunkId })),
                totalMatches: result.totalMatches,
                context: result.context,
            }
        }, 200);
    } catch(e) {
        return jsonResponse({ code: "SEARCH_ERROR", message: e instanceof Error ? e.message : "Unknown" }, 500);
    }
};
