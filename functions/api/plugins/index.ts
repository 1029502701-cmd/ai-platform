import { jsonResponse } from "../../_auth.ts";
import type { PagesFunction } from "@cloudflare/workers-types";
import { PluginRegistryService } from "../../../shared/plugin/services/registry.service";

type RequestContext = Parameters<PagesFunction>[0]

export const onRequestGet = function(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  var pluginId = url.params.get("id");
  
  if (!pluginId) {
    return jsonResponse({ code: "INVALID_PARAMS", message: "Plugin ID is required" }, 400);
  }

  const registry = new PluginRegistryService({ db: null as any });
  var manifest = registry.getPlugin(pluginId);
  
  if (!manifest) {
    return jsonResponse({ code: "NOT_FOUND", message: "Plugin not found" }, 404);
  }

  return jsonResponse({
    success: true,
    data: {
      plugin: {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        category: manifest.category,
        capabilities: manifest.capabilities,
        permissions: manifest.permissions || [],
        routes: manifest.routes || [],
      },
    },
  }, 200);
};

