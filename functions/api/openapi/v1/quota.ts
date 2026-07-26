import type { PagesFunction } from "@cloudflare/workers-types";
import { requireOpenApiAuth, jsonResponse } from "../../_openapi_auth.ts";
import BillingService from "../../../../shared/billing/service.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireOpenApiAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const billingInfo = await BillingService.getUserBillingInfo(
      context.env as any,
      auth.developerId
    );

    return jsonResponse({
      wallet: billingInfo.wallet || null,
      transactions: (billingInfo.transactions || []).slice(0, 20),
      subscriptions: (billingInfo.subscriptions || []),
      activePlan: null,
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "ERROR", message: String(e) }, 500);
  }
};