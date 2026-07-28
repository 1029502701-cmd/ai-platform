import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

const handler = async (context) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED", message: "Admin access required" }, 403);

  const url = new Request(context.request.url).params;
  const pluginId = url.get("id");

  if (!pluginId) {
    return jsonResponse({ code: "INVALID_PARAMS", message: "Plugin ID is required" }, 400);
  }

  return jsonResponse({
    success: true,
    message: `Plugin ${pluginId} enabled`,
    pluginId,
  });
};

export const POST = handler;

