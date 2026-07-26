import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../../_auth.ts";
import { MemoryService } from "../../../../shared/agent/memory.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const userId = String(auth.user.id);
    const messages = MemoryService.getUserMessages(userId);
    return jsonResponse({ memoryType: "conversation", messages, count: messages.length }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
