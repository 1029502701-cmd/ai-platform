import type { PagesFunction } from "@cloudflare/workers-types";
import BillingService from "../../../../shared/billing/service.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  try {
    const { env } = context;
    const body = await context.request.json() as any;

    const orderId = body.orderId || body.order_id;
    const paymentRef = body.paymentRef || body.payment_ref || body.transactionId;

    if (!orderId) return new Response(JSON.stringify({ code: "MISSING_ORDER_ID" }), { status: 400 });

    const confirmed = await BillingService.confirmPayment(env, parseInt(String(orderId)));
    if (!confirmed) return new Response(JSON.stringify({ code: "ORDER_NOT_FOUND" }), { status: 404 });

    const db = (env as any).DB;
    if (db?.prepare) {
      const q = "UPDATE billing_orders SET payment_ref = ?, status = 'paid', paid_at = datetime('now') WHERE id = ?";
      await db.prepare(q).run(paymentRef || "", parseInt(String(orderId)));
    }

    return new Response(JSON.stringify({ success: true, confirmed }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ code: "CALLBACK_ERROR", message: String(e) }), { status: 500 });
  }
};