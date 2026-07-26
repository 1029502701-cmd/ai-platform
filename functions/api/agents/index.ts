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

type BodyType = Record<string, unknown>;

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  try {
    const body = (await context.request.json()) as BodyType;
    const key = (body.key as string) || (body.agentKey as string) || "";
    const name = (body.name as string) || "";
    if (!key || !name) return jsonResponse({ code: "BAD_REQUEST", message: "key and name required" }, 400);

    const existing = await getAgent(key, context.env as any);
    if (existing) return jsonResponse({ code: "DUPLICATE", message: "Agent already exists" }, 409);

    const { createAgent } = await import("../../../shared/agent/registry.ts");
    const id = await createAgent(context.env as any, {
      key, name, description: (body.description as string) ?? "", defaultModel: (body.defaultModel as string) ?? "",
      maxSteps: (body.maxSteps as number) ?? 5, knowledgeBaseId: (body.knowledgeBaseId as number) ?? undefined,
      tools: (body.tools as unknown[]) ?? [], config: (body.config as Record<string, unknown>) ?? {},
    });

    return jsonResponse({ success: true, agentId: id }, 201);
  } catch (e) {
    return jsonResponse({ code: "CREATE_ERROR", message: String(e) }, 500);
  }
};
