import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ orders: [] }, 200);

    const rows: any[] = (await db.prepare(
      "SELECT bo.*, bp.name as product_name FROM billing_orders bo LEFT JOIN billing_products bp ON bp.id = bo.product_id WHERE bo.user_id = ? ORDER BY bo.created_at DESC LIMIT 50"
    ).bind(auth.user.id).all()) || [];

    return jsonResponse({
      orders: rows.map((r: any) => ({
        id: r.id, orderNo: r.order_no, productName: r.product_name,
        amountCents: r.amount_cents, currency: r.currency,
        status: r.status, createdAt: r.created_at,
      })),
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};
