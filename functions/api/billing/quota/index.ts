import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../../_auth.ts";
import BillingService from "../../../../shared/billing/service.ts";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const result = await BillingService.checkQuota(context.env as any, parseInt(String(auth.user.id)));
    return jsonResponse(result, 200);
  } catch (e) {
    return jsonResponse({ hasBalance: true, balanceCents: 0, dailyLimit: 0, dailyUsed: 0 }, 200);
  }
};