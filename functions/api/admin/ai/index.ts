import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
    const auth = await requireAdminAuth(context);
    if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
    const env = context.env as any;
    const db = env.DB;
    try {
        // Scenarios
        const scenarios: any[] = await db.prepare("SELECT * FROM ai_scenarios ORDER BY key").all();
        // Models
        const models: any[] = await db.prepare("SELECT model_id,provider,provider_model_name,priority,status FROM ai_models ORDER BY priority DESC").all();
        // Providers
        const providers: any[] = await db.prepare("SELECT * FROM ai_providers ORDER BY name").all();
        // Prompt templates count
        const promptCount: any = await db.prepare("SELECT COUNT(*) as cnt FROM ai_prompt_templates").first();
        // Tools
        const tools: any[] = await db.prepare("SELECT name,description,enabled FROM ai_tools").all();
        return jsonResponse({ scenarios:scenarios||[], models:(models||[]).slice(0,20), providers:providers||[], promptTemplateCount:promptCount?.cnt??0, tools:(tools||[]) }, 200);
    } catch(e) {
        return jsonResponse({ code:"QUERY_ERROR", message:e instanceof Error?e.message:"Unknown" }, 500);
    }
};
