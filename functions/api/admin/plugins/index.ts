import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";

const handler = async (context) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED", message: "Admin access required" }, 403);

  // In a real implementation, this would query the database plugins table
  // For now, return a stub response
  return jsonResponse({
    plugins: [],
    count: 0
  });
};

export const GET = handler;
export const handler = handler;