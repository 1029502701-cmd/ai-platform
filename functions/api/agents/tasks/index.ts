import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const db = (context.env as any)?.DB;
    const userId = auth.user.id;
    if (!db || !db.prepare) return jsonResponse({ code: "DB_NOT_READY" }, 503);

    const rows: any[] = await db.prepare(
      "SELECT at.*, a.key as agentKey, a.name as agentName FROM agent_tasks at " +
      "JOIN agents a ON a.id = at.agent_id WHERE at.user_id = ? ORDER BY at.created_at DESC LIMIT 50"
    ).bind(userId).all();

    return jsonResponse({
      tasks: (rows || []).map((r: any) => ({
        id: r.id,
        agentKey: r.agentKey,
        agentName: r.agentName,
        status: r.status,
        currentStep: r.current_step,
        stepsCompleted: r.steps_completed,
        totalSteps: r.total_steps,
        createdAt: r.created_at,
      })),
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "QUERY_ERROR", message: String(e) }, 500);
  }
};
