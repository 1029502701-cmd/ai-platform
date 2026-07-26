import type { PagesFunction } from "@cloudflare/workers-types";
import { requireOpenApiAuth, jsonResponse } from "../../_openapi_auth.ts";
import { DeveloperService } from "../../../../shared/developer/service.ts";
import { generateViaCore } from "../../../../shared/services/ai_core.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireOpenApiAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const startTime = Date.now();
    const body = await context.request.json() as any;
    const prompt = body.prompt || body.messages?.[0]?.content;
    const model = body.model || "gpt-4o-mini";

    if (!prompt) return jsonResponse({ code: "MISSING_PROMPT", message: "prompt field required" }, 400);

    const coreResult = await generateViaCore(context.env as any, {
      requestId: crypto.randomUUID(),
      userId: String(auth.developerId),
      scenario: body.scenario || "chat",
      aiRequest: { ...body, model },
    });

    await DeveloperService.recordUsage(context.env as any, {
      developerId: auth.developerId,
      apiKeyId: auth.apiKey.id,
      resourceType: 'chat',
      endpoint: '/openapi/v1/chat',
      latencyMs: Date.now() - startTime,
      statusCode: coreResult.ok ? 200 : 500,
    });

    if (!coreResult.ok) return jsonResponse({ error: coreResult.error }, 500);

    return jsonResponse({ success: true, data: coreResult.data }, 200);
  } catch (e: any) {
    return jsonResponse({ code: "CHAT_ERROR", message: e.message }, 500);
  }
};