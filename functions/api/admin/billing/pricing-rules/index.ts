import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ rules: [] }, 200);

    const rows: any[] = await db.prepare(
      "SELECT id, rule_key, service_type, target, cost_per_1m_input, cost_per_1m_output, credits_per_1m_input, credits_per_1m_output, image_cost_cents, agent_cost_cents, enabled FROM billing_rules"
    ).all();

    return jsonResponse({
      rules: (rows || []).map((r: any) => ({
        ...r, costPer1mInput: r.cost_per_1m_input, costPer1mOutput: r.cost_per_1m_output,
        creditsPer1mInput: r.credits_per_1m_input, creditsPer1mOutput: r.credits_per_1m_output,
        imageCostCents: r.image_cost_cents, agentCostCents: r.agent_cost_cents,
      })),
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};