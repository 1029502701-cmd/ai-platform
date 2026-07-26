import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../../_auth.ts";
import BillingService from "../../../../shared/billing/service.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const userId = auth.user.id;
    const billingInfo = await BillingService.getUserBillingInfo(context.env as any, parseInt(String(userId)));

    // Also check active subscription
    const db = (context.env as any)?.DB;
    let activePlan: any = null;
    if (db?.prepare) {
      activePlan = await db.prepare(
        "SELECT us.*, bp.name as plan_name, bp.code as plan_code, bp.product_type FROM user_subscriptions us " +
        "JOIN billing_products bp ON bp.id = us.product_id " +
        "WHERE us.user_id = ? AND us.status = '" + "'active'" + " ORDER BY us.created_at DESC LIMIT 1"
      ).bind(parseInt(String(userId))).first();
    }

    return jsonResponse({
      wallet: billingInfo.wallet || null,
      transactions: billingInfo.transactions || [],
      subscriptions: billingInfo.subscriptions || [],
      activePlan: activePlan ? {
        name: activePlan.plan_name,
        code: activePlan.plan_code,
        type: activePlan.product_type,
        expireAt: activePlan.expire_at,
      } : null,
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};