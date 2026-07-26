import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";
import { createAgent } from "../../../../shared/agent/registry.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);
  try {
    const body = await context.request.json() as any;
    const id = await createAgent(context.env as any, {
      key: body.key, name: body.name, description: body.description,
      defaultModel: body.defaultModel, maxSteps: body.maxSteps,
      knowledgeBaseId: body.knowledgeBaseId, tools: body.tools, config: body.config,
    });
    return jsonResponse({ success: true, agentId: id }, 201);
  } catch (e) {
    return jsonResponse({ code: "CREATE_ERROR", message: String(e) }, 500);
  }
};
