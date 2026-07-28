import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../admin/_auth";
import { PluginPublishService } from "../../../../../shared/plugin/services/plugin_publish_service";

declare global { interface Env { DB: any; } }
let publishService: PluginPublishService | null = null;

function getPublishService() {
  if (!publishService) throw new Error("PluginPublishService not initialized");
  return publishService;
}

export const onRequestPost = async (context) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN", message: "Admin authentication required" }, 403);
  
  const url = new Request(context.request.url);
  const requestId = url.searchParams.get("id");
  if (!requestId) return jsonResponse({ code: "INVALID_PARAMS", message: "Request ID is required" }, 400);
  
  try {
    const body = await context.request.json();
    const reviewNote = body?.note || "";
    const result = await getPublishService().approvePlugin(parseInt(requestId), auth.user.id, reviewNote);
    
    return jsonResponse({
      success: true,
      message: "Plugin approved successfully",
      data: result,
    }, 200);
  } catch (error) {
    console.error("Error approving plugin:", error);
    return jsonResponse({ code: "ERROR", message: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
};
