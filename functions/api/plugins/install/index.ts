import { jsonResponse, requirePermission } from "../../../_auth.ts";
import type { PagesFunction } from "@cloudflare/workers-types";
import { managementService } from "../../../../shared/plugin/services/plugin_management.service";
import { PluginRegistryService } from "../../../../shared/plugin/services/registry.service";

type RequestContext = Parameters<PagesFunction>[0]

export const onRequestPost = async function(context) {
  const auth = await requirePermission(context.env, context.request, "plugin.install");
  if (!auth) {
    return jsonResponse({ code: "FORBIDDEN", message: "Plugin installation permission required" }, 403);
  }

  const { env, request } = context;
  const url = new URL(request.url);
  var pluginId = url.params.get("id");
  
  if (!pluginId) {
    return jsonResponse({ code: "INVALID_PARAMS", message: "Plugin ID is required" }, 400);
  }

  // Try to get manifest from body (simplified - in practice would validate)
  var body = await request.json();
  var manifest = body.manifest || { id: pluginId, name: pluginId, version: "1.0.0", description: "Plugin to be installed" };

  try {
    var result = await managementService.install(manifest, { userId: auth.user.id });
    return jsonResponse({ success: true, message: "Plugin installed successfully", result }, 200);
  } catch (error) {
    return jsonResponse({ 
      code: "ERROR", 
      message: error.message || "Failed to install plugin" 
    }, 500);
  }
};

