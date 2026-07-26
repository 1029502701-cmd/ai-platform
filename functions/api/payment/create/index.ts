import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../../_auth.ts";
import BillingService from "../../../../shared/billing/service.ts";
import { getPaymentProvider, genIdempotencyKey } from "../../../../shared/billing/payment.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const body = await context.request.json() as any;
    const provider = body.provider || "manual";
    const productId = body.productId;
    const productCode = body.productCode;

    // Get product info
    const db = (context.env as any)?.DB;
    let amountCents = 0;
    if (db?.prepare && productId) {
      const product: any = await db.prepare("SELECT price_cents FROM billing_products WHERE id = ? AND status = '" + "'active'" + "'").bind(productId).first();
      amountCents = product?.price_cents || 0;
    } else if (productCode) {
      const product: any = await db?.prepare("SELECT price_cents FROM billing_products WHERE code = ?").bind(productCode).first();
      amountCents = product?.price_cents || 0;
    }

    if (amountCents <= 0) return jsonResponse({ code: "INVALID_PRODUCT" }, 400);

    // Check idempotency
    genIdempotencyKey(auth.user.id, productCode || productId || "");
    const existing: any = await db?.prepare("SELECT id FROM billing_orders WHERE user_id = ? AND amount_cents = ? AND status = '" + "'pending'" + "'").bind(auth.user.id, amountCents).first();

    let orderId: number;
    if (existing) {
      orderId = existing.id;
    } else {
      const order = await BillingService.createOrder(context.env as any, {
        userId: auth.user.id, productId, amountCents,
      });
      orderId = order!.id!;
    }

    // Get payment provider and create payment
    const payProvider = getPaymentProvider(provider);
    const result = await payProvider.createPayment({
      orderId: String(orderId),
      amountCents,
      currency: "CNY",
    });

    return jsonResponse({ success: true, orderId, provider, paymentInfo: result }, 200);
  } catch (e) {
    return jsonResponse({ code: "PAYMENT_ERROR", message: String(e) }, 500);
  }
};
