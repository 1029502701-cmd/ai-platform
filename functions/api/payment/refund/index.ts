import type { PagesFunction } from "@cloudflare/workers-types";
import { requireAdminAuth, jsonResponse } from "../../../_auth.ts";
import BillingService from "../../../../shared/billing/service.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: "FORBIDDEN_ADMIN_REQUIRED" }, 403);

  try {
    const body = await context.request.json() as any;
    const orderId = body.orderId;
    const amountCents = body.amountCents || 0;

    if (!orderId) return jsonResponse({ code: "BAD_REQUEST", message: "orderId required" }, 400);

    const db = (context.env as any)?.DB;
    if (!db?.prepare) return jsonResponse({ code: "DB_NOT_READY" }, 503);

    const order: any = await db.prepare("SELECT * FROM billing_orders WHERE id = ?").bind(orderId).first();
    if (!order) return jsonResponse({ code: "NOT_FOUND" }, 404);

    if (order.payment_provider && order.payment_provider !== "manual") {
      const { getPaymentProvider } = await import("../../../../shared/billing/payment.ts");
      const provider = getPaymentProvider(order.payment_provider);
      const refundResult = await provider.refundPayment(order.payment_ref || "", amountCents);
      if (!refundResult.success) {
        return jsonResponse({ code: "PROVIDER_REFUND_FAILED", message: "Payment provider refund failed" }, 502);
      }
    }

    const walletResult = await BillingService.refund(context.env as any, {
      userId: order.user_id,
      amountCents: amountCents || order.amount_cents,
      reason: "admin_refund",
    });

    // Update order status to refunded
    const updateQ = "UPDATE billing_orders SET status = 'refunded', refunded_at = datetime('now') WHERE id = ?";
    await db.prepare(updateQ).run(orderId);

    return jsonResponse({ success: true, refund: walletResult }, 200);
  } catch (e) {
    return jsonResponse({ code: "REFUND_ERROR", message: String(e) }, 500);
  }
};