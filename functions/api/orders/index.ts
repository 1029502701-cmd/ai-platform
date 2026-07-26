import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../_auth.ts";
import BillingService from "../../../shared/billing/service.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const body = await context.request.json() as any;
    const productId = body.productId || null;
    const amountCents = body.amountCents || 0;

    if (!amountCents || amountCents <= 0) {
      return jsonResponse({ code: "BAD_REQUEST", message: "amount is required" }, 400);
    }

    const order = await BillingService.createOrder(context.env as any, {
      userId: auth.user.id, productId, amountCents,
    });

    if (!order) return jsonResponse({ code: "CREATE_FAILED" }, 500);

    return jsonResponse({ success: true, order }, 201);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};