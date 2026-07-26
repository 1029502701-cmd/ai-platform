import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../../_auth.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0], { id }: any) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);

  try {
    const db = (context.env as any)?.DB;
    if (!db?.prepare || !id) return jsonResponse({ code: "MISSING_ORDER_ID" }, 400);

    const order: any = await db.prepare(
      "SELECT bo.*, bp.name as product_name FROM billing_orders bo LEFT JOIN billing_products bp ON bp.id = bo.product_id WHERE bo.id = ?"
    ).bind(parseInt(String(id))).first();

    if (!order) return jsonResponse({ code: "ORDER_NOT_FOUND" }, 404);

    const txns: any[] = await db.prepare(
      "SELECT * FROM billing_transactions WHERE order_id = ? ORDER BY created_at DESC"
    ).bind(parseInt(String(id))).all();

    return jsonResponse({
      id: order.id,
      orderNo: order.order_no,
      userId: order.user_id,
      productName: order.product_name,
      amountCents: order.amount_cents,
      currency: order.currency,
      status: order.status,
      paymentProvider: order.payment_provider,
      paymentRef: order.payment_ref,
      paidAt: order.paid_at,
      createdAt: order.created_at,
      transactions: (txns || []).map((t: any) => ({
        id: t.id,
        type: t.tx_type,
        amountCents: t.amount_cents,
        reason: t.reason,
        createdAt: t.created_at,
      })),
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};