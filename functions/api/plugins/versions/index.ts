import { jsonResponse } from "../../../_auth.ts";
import type { PagesFunction } from "@cloudflare/workers-types";
import { versionService } from "../../../../shared/plugin/services/plugin_version.service";

type RequestContext = Parameters<PagesFunction>[0]

export const onRequestGet = async function(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  var pluginId = url.params.get("id");
  
  if (!pluginId) {
    return jsonResponse({ code: "INVALID_PARAMS", message: "Plugin ID is required" }, 400);
  }

  var versions = await versionService.getVersions(pluginId);

  return jsonResponse({
    success: true,
    data: {
      pluginId: pluginId,
      versions: versions,
    },
  }, 200);
};

