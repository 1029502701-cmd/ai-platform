import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../_auth.ts";
import { listAgents, getAgent } from "../../../shared/agent/registry.ts";
import { createRequestLogger } from "../../../shared/logger/requestLogger.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  try {
    const env = context.env as any;
    const agents = await listAgents(env);
    return jsonResponse({ agents }, 200);
  } catch (e) {
    return jsonResponse({ code: "QUERY_ERROR", message: String(e) }, 500);
  }
};

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  try {
    const body = await context.request.json();
    const key = body.key || body.agentKey || "";
    const name = body.name || "";
    if (!key || !name) return jsonResponse({ code: "BAD_REQUEST", message: "key and name required" }, 400);

    const existing = await getAgent(key, context.env as any);
    if (existing) return jsonResponse({ code: "DUPLICATE", message: "Agent already exists" }, 409);

    const { createAgent } = await import("../../../shared/agent/registry.ts");
    const id = await createAgent(context.env as any, {
      key, name, description: body.description, defaultModel: body.defaultModel,
      maxSteps: body.maxSteps, knowledgeBaseId: body.knowledgeBaseId,
      tools: body.tools, config: body.config,
    });

    return jsonResponse({ success: true, agentId: id }, 201);
  } catch (e) {
    return jsonResponse({ code: "CREATE_ERROR", message: String(e) }, 500);
  }
};
