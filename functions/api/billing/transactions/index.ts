import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const db = (context.env as any)?.DB;
    const userId = auth.user.id;
    if (!db?.prepare) return jsonResponse({ transactions: [] }, 200);

    const rows: any[] = (await db.prepare(
      "SELECT * FROM billing_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    ).bind(userId).all()) || [];

    return jsonResponse({
      transactions: rows.map((r: any) => ({
        id: r.id, txType: r.tx_type, amountCents: r.amount_cents,
        reason: r.reason, createdAt: r.created_at,
        balanceBefore: r.balance_before, balanceAfter: r.balance_after,
      })),
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
