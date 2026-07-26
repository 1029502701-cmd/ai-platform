import type { PagesFunction } from "@cloudflare/workers-types";
import { jsonResponse } from "../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const agentKey = context.params?.id as string;
  if (!agentKey) return jsonResponse({ code: "MISSING_ID" }, 400);
  return jsonResponse({ message: `Agent detail endpoint for: ${agentKey}` }, 200);
};