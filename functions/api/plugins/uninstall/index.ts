import { jsonResponse, requirePermission } from "../../_auth.ts";
import type { PagesFunction } from "@cloudflare/workers-types";
import { managementService } from "../../../../shared/plugin/services/plugin_management.service";

type RequestContext = Parameters<PagesFunction>[0]

export const onRequestPost = async function(context) {
  const auth = await requirePermission(context.env, context.request, "plugin.uninstall");
  if (!auth) {
    return jsonResponse({ code: "FORBIDDEN", message: "Plugin uninstall permission required" }, 403);
  }

  const { env, request } = context;
  const url = new URL(request.url);
  var pluginId = url.params.get("id");
  
  if (!pluginId) {
    return jsonResponse({ code: "INVALID_PARAMS", message: "Plugin ID is required" }, 400);
  }

  try {
    var result = await managementService.uninstall(pluginId, auth.user.id);
    return jsonResponse({ success: true, message: result.reason }, 200);
  } catch (error) {
    return jsonResponse({ 
      code: "ERROR", 
      message: error.message || "Failed to uninstall plugin" 
    }, 400);
  }
};

