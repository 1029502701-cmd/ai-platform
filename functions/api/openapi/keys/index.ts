import type { PagesFunction } from "@cloudflare/workers-types";
import { requireOpenApiAuth, jsonResponse } from "../../_openapi_auth.ts";
import { DeveloperService } from "../../../../shared/developer/service.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireOpenApiAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const body = await context.request.json() as any;
    const { name } = body;
    if (!name) return jsonResponse({ code: "MISSING_NAME" }, 400);

    const { apiKey, rawKey } = await DeveloperService.createApiKey(context.env as any, {
      developerId: auth.developerId,
      name,
      permissions: ['chat', 'image', 'agent'],
    });

    if (!apiKey || !rawKey) return jsonResponse({ code: "CREATE_FAILED" }, 500);

    return jsonResponse({ success: true, data: { key: apiKey.id, rawKey } }, 201);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};